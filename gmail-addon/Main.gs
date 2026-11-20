/**
 * Gmail sidebar: the cards the forwarder sees, and what each button does.
 *
 * Flow: open an email -> "Analyze request" -> details, similar past transports
 * and a suggested price -> "Create reply draft" (the offer) -> carriers for the
 * route and price request drafts -> record carrier quotes -> "Prepare заявки"
 * when the order is confirmed. Nothing is ever sent automatically.
 */

var CACHE_SECONDS = 6 * 60 * 60;

/** This user's company sheet and signature, plus that company's settings (Setup.gs). */
function getSettings_() {
  var sheetId = getCompanySheetId_();
  var company = {};
  if (sheetId) {
    try {
      company = readCompanySettings_(SpreadsheetApp.openById(sheetId));
    } catch (err) {
      // Reading the sheet itself will report the problem where it's needed.
    }
  }
  var get = function (name) { return company[name] || CONFIG[name] || ''; };
  return {
    historySheetId: sheetId,
    signature: getSignature_(),
    offerTerms: get('OFFER_TERMS'),
    companyName: get('COMPANY_NAME'),
    assistantName: get('ASSISTANT_NAME'),
    logoUrl: get('LOGO_URL'),
    brandColor: get('BRAND_COLOR'),
    clientPaymentTerms: get('CLIENT_PAYMENT_TERMS'),
    carrierPaymentTerms: get('CARRIER_PAYMENT_TERMS'),
    clientTemplateId: company.CLIENT_TEMPLATE_ID || '',
    carrierTemplateId: company.CARRIER_TEMPLATE_ID || '',
    cargoExclusions: get('CARGO_EXCLUSIONS'),
    weightAssumption: get('WEIGHT_ASSUMPTION')
  };
}

/**
 * When an update adds permissions (e.g. Drive for the заявки), Gmail doesn't ask
 * again by itself. This shows Google's "Authorize" prompt in the sidebar instead
 * of letting an action fail with a permission error.
 */
function requireAuthorization_() {
  var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  if (info.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    CardService.newAuthorizationException()
      .setAuthorizationUrl(info.getAuthorizationUrl())
      .setResourceDisplayName(DEFAULT_ASSISTANT_NAME)
      .throwException();
  }
}

function getMessage_(e) {
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  return GmailApp.getMessageById(e.gmail.messageId);
}

function eur_(n) {
  return '€' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function notify_(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text))
    .build();
}

function field_(label, value) {
  return CardService.newDecoratedText().setTopLabel(label).setText(value || '—').setWrapText(true);
}

// ---- Triggers ---------------------------------------------------------------

/** Shown when the add-on is opened with no email selected. */
function onHomepage() {
  requireAuthorization_();
  var s = getSettings_();
  var hasKey = !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(t_('home_intro')))
    .addWidget(languageButton_());
  if (!hasKey) section.addWidget(field_(t_('api_key_label'), t_('api_key_missing')));
  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(s, s.companyName))
    .addSection(section)
    .addSection(s.historySheetId ? buildWorkspaceSection_(s) : buildSetupSection_(s));
  if (s.historySheetId) card.addSection(buildTemplatesSection_(s)).addSection(buildSignatureSection_(s));
  return card.build();
}

/**
 * Shown when an email is opened. If it was analyzed before, shows that analysis
 * straight away (no Claude call). Otherwise Claude is only called on the button.
 */
function onGmailMessage(e) {
  requireAuthorization_();
  var settings = getSettings_();
  try {
    var saved = loadAnalysis_(settings, e.gmail.messageId);
    if (saved) return renderAnalysis_(e.gmail.messageId, saved, settings);
  } catch (err) {
    // Fall back to the normal card below.
  }
  var button = primaryButton_(t_('analyze'), settings)
    .setOnClickAction(CardService.newAction().setFunctionName('onAnalyze'));
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(t_('analyze_intro')))
    .addWidget(button)
    .addWidget(languageButton_());
  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(settings, t_('subtitle_requests')))
    .addSection(section);
  if (!settings.historySheetId) card.addSection(buildSetupSection_(settings));
  return card.build();
}

// ---- Actions ----------------------------------------------------------------

function onAnalyze(e) {
  requireAuthorization_();
  var settings = getSettings_();
  var message = getMessage_(e);
  var request;
  try {
    request = extractRequest_(message.getSubject(), message.getFrom(), message.getPlainBody());
  } catch (err) {
    return notify_(err.message);
  }
  if (!request.is_transport_request) {
    return notify_(t_('not_request'));
  }
  try {
    saveAnalysis_(settings, e.gmail.messageId, request);
  } catch (err) {
    // Still show the analysis; it just won't be remembered after 6 hours.
  }

  var card;
  try {
    card = renderAnalysis_(e.gmail.messageId, request, settings);
  } catch (err) {
    return notify_(t_('sheet_read_error', { error: err.message }));
  }
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/** The saved analysis of the open email (see Requests.gs). */
function cachedRequest_(e) {
  var request = loadAnalysis_(getSettings_(), e.gmail.messageId);
  if (!request) throw new Error(t_('analyze_first'));
  return request;
}

/** Reads the sheet (no Claude call) and builds the analysis card. */
function renderAnalysis_(requestId, request, settings) {
  var history = [], carriersTab = [], quotes = [];
  if (settings.historySheetId) {
    history = readHistory_(settings.historySheetId);
    carriersTab = readCarriers_(settings.historySheetId);
    quotes = readQuotes_(settings.historySheetId, requestId);
  }
  var similar = findSimilar_(request, history);
  var suggestion = scaleSuggestion_(suggestPrice_(similar), request.truck_count);
  if (suggestion) CacheService.getUserCache().put('sugg:' + requestId, String(suggestion.sell), CACHE_SECONDS);
  var ranked = rankCarriers_(request, history, carriersTab);
  return buildAnalysisCard_(request, similar, suggestion, ranked, carriersTab, quotes, settings);
}

function buildAnalysisCard_(r, similar, suggestion, carriers, carriersTab, quotes, settings) {
  var route = [r.from_city, r.from_country].filter(String).join(', ') + ' → ' +
    [r.to_city, r.to_country].filter(String).join(', ');
  var load = [r.cargo, r.pallets != null ? t_('pallets', { n: r.pallets }) : '',
    r.weight_kg != null ? r.weight_kg + ' kg' : ''].filter(String).join(' · ');

  var details = CardService.newCardSection().setHeader(t_('read_from_email'))
    .addWidget(iconField_('MAP_PIN', t_('route'), route))
    .addWidget(iconField_('CLOCK', t_('loading'), [r.loading_date, r.loading_time].filter(Boolean).join(' ')))
    .addWidget(iconField_('CLOCK', t_('delivery'), r.delivery_date))
    .addWidget(iconField_('DESCRIPTION', t_('cargo'), load))
    .addWidget(iconField_('CAR', t_('truck'),
      (r.truck_count > 1 ? r.truck_count + ' × ' : '') + truckLabel_(r.truck_type)));
  if (r.consignee) details.addWidget(iconField_('PERSON', t_('field_consignee'), r.consignee));
  if (r.customs_points) details.addWidget(iconField_('MAP_PIN', t_('field_customs_points'), r.customs_points));
  if (r.special_requirements) {
    details.addWidget(iconField_('DESCRIPTION', t_('field_special_requirements'), r.special_requirements));
  }
  if (r.missing_info.length) {
    details.addWidget(iconField_('STAR', t_('missing'), r.missing_info.join('; ')));
  }
  details.addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText(t_('analyze_again'))
      .setOnClickAction(CardService.newAction().setFunctionName('onAnalyze')))
    .addButton(languageButton_()));

  var history = CardService.newCardSection().setHeader(t_('similar_header'))
    .setCollapsible(true).setNumUncollapsibleWidgets(2);
  if (!settings.historySheetId) {
    history.addWidget(CardService.newTextParagraph().setText(t_('no_sheet')));
  } else if (similar.length === 0) {
    history.addWidget(CardService.newTextParagraph().setText(t_('no_similar')));
  } else {
    similar.forEach(function (h) {
      history.addWidget(iconField_('DOLLAR', h.from_city + ' → ' + h.to_city + ' · ' + truckLabel_(h.truck_type) + ' · ' +
        t_('delivered', { date: formatDay_(transportDate_(h)) }), '')
        .setText(t_('similar_line', { sold: eur_(h.sold_eur), carrier: eur_(h.carrier_eur),
          margin: eur_(h.sold_eur - h.carrier_eur) }))
        .setWrapText(true));
    });
  }

  var offer = CardService.newCardSection().setHeader(t_('your_offer'));
  if (suggestion) {
    offer.addWidget(CardService.newTextParagraph().setText(t_('suggested', {
      sell: eur_(suggestion.sell), carrier: eur_(suggestion.carrier),
      margin: eur_(suggestion.margin), n: suggestion.basedOn }) +
      (suggestion.trucks ? ' ' + t_('for_trucks', { n: suggestion.trucks }) : '')));
  }
  offer
    .addWidget(CardService.newTextInput()
      .setFieldName('price')
      .setTitle(t_('offer_price'))
      .setValue(suggestion ? String(suggestion.sell) : ''))
    .addWidget(primaryButton_(t_('create_reply'), settings)
      .setComposeAction(
        CardService.newAction().setFunctionName('onCreateDraft'),
        CardService.ComposedEmailType.REPLY_AS_DRAFT));

  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(settings, t_('subtitle_request', { route: routeLabel_(r) })))
    .addSection(details)
    .addSection(history)
    .addSection(offer)
    .addSection(buildCarriersSection_(carriers, settings));
  if (settings.historySheetId) card.addSection(buildQuotesSection_(quotes, carriers, carriersTab));
  return card.addSection(buildOrderSection_(settings, r)).build();
}

/** Carriers on the route first, then the rest of the Carriers tab. */
function carrierChoices_(ranked, carriersTab) {
  var seen = {};
  var names = [];
  ranked.map(function (c) { return c.name; })
    .concat(carriersTab.map(function (c) { return String(c.carrier || '').trim(); }))
    .forEach(function (name) {
      var key = norm_(name);
      if (key && !seen[key]) { seen[key] = true; names.push(name); }
    });
  return names;
}

function buildQuotesSection_(quotes, ranked, carriersTab) {
  var section = CardService.newCardSection().setHeader(t_('quotes_header'));
  if (quotes.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText(t_('no_quotes')));
  }
  quotes.forEach(function (q, i) {
    section.addWidget(iconField_('DOLLAR', '', '')
      .setText((i === 0 ? '<b>' : '') + q.carrier + ': ' + eur_(q.price_eur) + (i === 0 ? '</b> ' + t_('cheapest') : ''))
      .setBottomLabel(t_('source_' + q.source) + (q.date instanceof Date ? ' · ' + Utilities.formatDate(q.date,
        Session.getScriptTimeZone(), 'dd.MM HH:mm') : ''))
      .setWrapText(true));
  });

  var names = carrierChoices_(ranked, carriersTab);
  if (names.length === 0) return section;
  var carrierPick = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('quote_carrier')
    .setTitle(t_('carrier'));
  names.forEach(function (name, i) { carrierPick.addItem(name, name, i === 0); });
  var sourcePick = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('quote_source')
    .setTitle(t_('received_by'));
  QUOTE_SOURCES.forEach(function (src, i) { sourcePick.addItem(t_('source_' + src), src, i === 0); });

  return section
    .addWidget(carrierPick)
    .addWidget(CardService.newTextInput().setFieldName('quote_price').setTitle(t_('their_price')))
    .addWidget(sourcePick)
    .addWidget(CardService.newTextButton()
      .setText(t_('save_quote'))
      .setOnClickAction(CardService.newAction().setFunctionName('onSaveQuote')));
}

function onSaveQuote(e) {
  requireAuthorization_();
  var inputs = e.commonEventObject.formInputs || {};
  var carrier = inputs.quote_carrier ? inputs.quote_carrier.stringInputs.value[0] : '';
  var price = parsePrice_(inputs.quote_price ? inputs.quote_price.stringInputs.value[0] : '');
  var source = inputs.quote_source ? inputs.quote_source.stringInputs.value[0] : QUOTE_SOURCES[0];
  if (!carrier) return notify_(t_('choose_carrier'));
  if (price == null) return notify_(t_('price_number', { example: 2080 }));

  var settings = getSettings_();
  var request;
  try {
    request = cachedRequest_(e);
    saveQuote_(settings.historySheetId, e.gmail.messageId, request, carrier, price, source);
  } catch (err) {
    return notify_(err.message);
  }
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(renderAnalysis_(e.gmail.messageId, request, settings)))
    .setNotification(CardService.newNotification().setText(t_('quote_saved', { carrier: carrier, price: eur_(price) })))
    .build();
}

function buildOrderSection_(settings, r) {
  var section = CardService.newCardSection().setHeader(t_('order_header'));
  if (r && r.order) {
    return section
      .addWidget(CardService.newTextParagraph().setText(t_('order_created', { number: r.order.number })))
      .addWidget(CardService.newButtonSet()
        .addButton(primaryButton_(t_('update_folder'), settings)
          .setOnClickAction(CardService.newAction().setFunctionName('onUpdateTransportFolder')))
        .addButton(CardService.newTextButton()
          .setText(t_('open_folder'))
          .setOpenLink(CardService.newOpenLink().setUrl(
            'https://drive.google.com/drive/folders/' + r.order.folder_id))));
  }
  return section
    .addWidget(CardService.newTextParagraph().setText(t_('order_intro')))
    .addWidget(primaryButton_(t_('prepare_orders'), settings)
      .setOnClickAction(CardService.newAction().setFunctionName('onOrderConfirmed')));
}

/** Label for a template field box: known fields are translated, others readable. */
function fieldLabel_(name) {
  return UI_TEXT['field_' + name] ? t_('field_' + name) : name.replace(/_/g, ' ');
}

/** "Иван Петров <ivan@x.bg>" -> {name, email} */
function parseSender_(from) {
  var m = String(from).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: '', email: String(from).trim() };
}

function onOrderConfirmed(e) {
  requireAuthorization_();
  var settings = getSettings_();
  if (!settings.historySheetId) return notify_(t_('connect_sheet_first'));
  var request, message, carriersTab, quotes, ranked, fieldPlan;
  try {
    request = cachedRequest_(e);
    message = getMessage_(e);
    carriersTab = readCarriers_(settings.historySheetId);
    quotes = readQuotes_(settings.historySheetId, e.gmail.messageId);
    ranked = rankCarriers_(request, readHistory_(settings.historySheetId), carriersTab);
    var templates = ensureTemplates_(SpreadsheetApp.openById(settings.historySheetId));
    fieldPlan = templateFieldPlan_(templatePlaceholders_([templates.client, templates.carrier]), request);
  } catch (err) {
    return notify_(err.message);
  }
  var cache = CacheService.getUserCache();
  var sell = request.offer_price || cache.get('sugg:' + e.gmail.messageId) || '';
  var sender = parseSender_(message.getFrom());
  var cheapest = quotes[0];

  var carrierPick = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('order_carrier')
    .setTitle(t_('carrier'));
  var names = carrierChoices_(ranked, carriersTab);
  var preselect = cheapest ? norm_(cheapest.carrier) : (names[0] ? norm_(names[0]) : '');
  names.forEach(function (name) { carrierPick.addItem(name, name, norm_(name) === preselect); });

  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(t_('order_check')))
    .addWidget(CardService.newTextInput().setFieldName('order_client')
      .setTitle(t_('client_company')).setValue(sender.name))
    .addWidget(CardService.newTextInput().setFieldName('order_sell')
      .setTitle(t_('agreed_sell')).setValue(String(sell)))
    .addWidget(carrierPick)
    .addWidget(CardService.newTextInput().setFieldName('order_carrier_price')
      .setTitle(t_('carrier_price')).setValue(cheapest ? String(cheapest.price_eur) : ''))
    .addWidget(CardService.newTextInput().setFieldName('order_plates')
      .setTitle(t_('plates')));
  // Fields of the company's own templates: read from the email where possible.
  fieldPlan.forEach(function (f) {
    section.addWidget(CardService.newTextInput().setFieldName('tf_' + f.name)
      .setTitle(fieldLabel_(f.name)).setValue(f.value));
  });
  section
    .addWidget(primaryButton_(t_('create_orders'), settings)
      .setOnClickAction(CardService.newAction().setFunctionName('onCreateOrders')));
  if (names.length === 0) {
    section = CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(
      t_('add_carriers_first')));
  }

  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(settings, t_('subtitle_order', { route: routeLabel_(request) })))
    .addSection(section)
    .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function onCreateOrders(e) {
  requireAuthorization_();
  var inputs = e.commonEventObject.formInputs || {};
  var get = function (name) { return inputs[name] ? inputs[name].stringInputs.value[0].trim() : ''; };
  var sell = parsePrice_(get('order_sell'));
  var carrierPrice = parsePrice_(get('order_carrier_price'));
  if (!get('order_client')) return notify_(t_('enter_client'));
  if (sell == null) return notify_(t_('enter_sell'));
  if (carrierPrice == null) return notify_(t_('enter_carrier_price'));

  var templateValues = {};
  Object.keys(inputs).forEach(function (name) {
    if (name.indexOf('tf_') === 0) templateValues[name.slice(3)] = inputs[name].stringInputs.value[0].trim();
  });

  var settings = getSettings_();
  var folder;
  try {
    var request = cachedRequest_(e);
    var message = getMessage_(e);
    var carrier = readCarriers_(settings.historySheetId).filter(function (c) {
      return norm_(c.carrier) === norm_(get('order_carrier'));
    })[0];
    if (!carrier) return notify_(t_('choose_carrier_list'));
    if (!String(carrier.email || '').trim()) {
      return notify_(t_('carrier_no_email', { carrier: carrier.carrier }));
    }
    var sender = parseSender_(message.getFrom());
    var order = {
      number: '', // given out in createOrderDocuments_, once the templates are ready
      date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy'),
      language: request.language,
      client_name: get('order_client'),
      client_contact: request.contact_name || sender.name,
      client_email: sender.email,
      sell_eur: sell,
      carrier_name: String(carrier.carrier).trim(),
      carrier_contact: String(carrier.contact_person || '').trim(),
      carrier_email: String(carrier.email).trim(),
      carrier_language: norm_(carrier.language) || 'bg',
      carrier_eur: carrierPrice,
      plates: get('order_plates'),
      from_city: request.from_city, from_country: request.from_country, from_address: request.from_address,
      to_city: request.to_city, to_country: request.to_country, to_address: request.to_address,
      loading_date: request.loading_date, delivery_date: request.delivery_date,
      cargo: request.cargo, pallets: request.pallets, weight_kg: request.weight_kg,
      truck_type: request.truck_type, truck_count: request.truck_count,
      loading_time: request.loading_time, consignee: request.consignee,
      customs_points: request.customs_points, special_requirements: request.special_requirements,
      template_values: templateValues,
      request_date: message.getDate().getTime()
    };
    folder = createOrderDocuments_(order, message, settings);
  } catch (err) {
    return notify_(t_('orders_failed', { error: err.message }));
  }
  // Remembered with the analysis, so the email shows the order and can update its folder.
  request.order = {
    number: order.number, folder_id: folder.getId(), carrier_email: order.carrier_email,
    carrier_name: order.carrier_name, request_date: order.request_date
  };
  try {
    saveAnalysis_(settings, e.gmail.messageId, request);
  } catch (err) {
    // The order is created; only the "Update transport folder" button won't show.
  }

  var done = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(t_('orders_done', {
      number: order.number, sell: eur_(sell), carrier: order.carrier_name, carrierPrice: eur_(carrierPrice) })))
    .addWidget(CardService.newTextButton()
      .setText(t_('open_folder'))
      .setOpenLink(CardService.newOpenLink().setUrl(folder.getUrl())))
    .addWidget(CardService.newTextParagraph().setText(t_('update_folder_hint')));
  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(settings, t_('subtitle_done', { number: order.number })))
    .addSection(done)
    .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function buildCarriersSection_(carriers, settings) {
  var section = CardService.newCardSection().setHeader(t_('carriers_header'));
  if (!settings.historySheetId || carriers.length === 0) {
    return section.addWidget(CardService.newTextParagraph().setText(t_('no_carriers')));
  }

  var withEmail = 0;
  var pick = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName('carriers')
    .setTitle(t_('ask_price'));
  carriers.forEach(function (c) {
    var b = c.best;
    section.addWidget(iconField_('PERSON', '', '')
      .setTopLabel([c.contact, c.phone].filter(String).join(' · ') || t_('no_contact'))
      .setText('<b>' + c.name + '</b>')
      .setBottomLabel(b.from_city + ' → ' + b.to_city + ' · ' + truckLabel_(b.truck_type) + ' · ' +
        t_('delivered', { date: formatDay_(transportDate_(b)) }) +
        ': ' + eur_(b.carrier_eur) + ' · ' + t_(c.runs === 1 ? 'runs_one' : 'runs_many', { n: c.runs }))
      .setWrapText(true));
    if (c.email) {
      pick.addItem(c.name, c.key, withEmail < PRESELECT_CARRIERS);
      withEmail += 1;
    }
  });

  if (withEmail === 0) {
    return section.addWidget(CardService.newTextParagraph().setText(t_('no_carrier_email')));
  }
  return section
    .addWidget(pick)
    .addWidget(primaryButton_(t_('draft_requests'), settings)
      .setOnClickAction(CardService.newAction().setFunctionName('onDraftCarrierRequests')));
}

/** Creates one price request draft per ticked carrier. Never sends. */
function onDraftCarrierRequests(e) {
  requireAuthorization_();
  var inputs = e.commonEventObject.formInputs || {};
  var picked = inputs.carriers ? inputs.carriers.stringInputs.value : [];
  if (picked.length === 0) return notify_(t_('tick_carrier'));

  var request;
  try {
    request = cachedRequest_(e);
  } catch (err) {
    return notify_(err.message);
  }
  // Gmail only lets an add-on create drafts after it presents the open email's token.
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);

  var settings = getSettings_();
  var history = readHistory_(settings.historySheetId);
  var chosen = rankCarriers_(request, history, readCarriers_(settings.historySheetId))
    .filter(function (c) { return c.email && picked.indexOf(c.key) !== -1; });

  var texts = {};
  try {
    chosen.forEach(function (c) {
      if (!texts[c.language]) texts[c.language] = draftCarrierRequest_(request, c.language);
      var t = texts[c.language];
      GmailApp.createDraft(c.email, t.subject,
        buildCarrierEmail_(c.language, c.contact, t.body, settings.signature));
    });
  } catch (err) {
    return notify_(err.message);
  }
  return notify_(t_(chosen.length === 1 ? 'drafts_one' : 'drafts_many', { n: chosen.length }));
}

/** Writes the offer with Claude and opens it as a reply draft. Never sends. */
function onCreateDraft(e) {
  requireAuthorization_();
  var inputs = e.commonEventObject.formInputs || {};
  var price = inputs.price ? inputs.price.stringInputs.value[0].trim() : '';
  if (!/^\d+([.,]\d+)?$/.test(price)) {
    throw new Error(t_('price_number', { example: 2500 }));
  }

  var message = getMessage_(e);
  var settings = getSettings_();
  var request = cachedRequest_(e);

  // Remember the offered price with the analysis, for the order form later.
  request.offer_price = price.replace(',', '.');
  try {
    saveAnalysis_(settings, e.gmail.messageId, request);
  } catch (err) {
    // The draft matters more; the order form just won't be pre-filled with this price.
  }
  var body = draftOffer_(request, price, message.getPlainBody(), settings);
  var draft = message.createDraftReply(body);
  return CardService.newComposeActionResponseBuilder().setGmailDraft(draft).build();
}

/** Saves the latest client and carrier email conversations into the transport folder. */
function onUpdateTransportFolder(e) {
  requireAuthorization_();
  var saved;
  try {
    var request = cachedRequest_(e);
    if (!request.order) return notify_(t_('analyze_first'));
    var message = getMessage_(e);
    saved = saveOrderThreads_(request.order, message, DriveApp.getFolderById(request.order.folder_id));
  } catch (err) {
    return notify_(err.message);
  }
  return notify_(t_('folder_updated', { n: saved }));
}
