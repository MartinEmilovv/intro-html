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
    carrierPaymentTerms: get('CARRIER_PAYMENT_TERMS')
  };
}

function getMessage_(e) {
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  return GmailApp.getMessageById(e.gmail.messageId);
}

function eur_(n) {
  return '€' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function month_(d) {
  if (d instanceof Date) return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  return String(d).slice(0, 7);
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
  var s = getSettings_();
  var hasKey = !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      'Open a transport request email and click <b>Analyze request</b>.'));
  if (!hasKey) section.addWidget(field_('Claude API key', 'Missing: add ANTHROPIC_API_KEY in Script Properties'));
  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(s, s.companyName))
    .addSection(section)
    .addSection(s.historySheetId ? buildWorkspaceSection_(s) : buildSetupSection_(s));
  if (s.historySheetId) card.addSection(buildSignatureSection_(s));
  return card.build();
}

/**
 * Shown when an email is opened. If it was analyzed before, shows that analysis
 * straight away (no Claude call). Otherwise Claude is only called on the button.
 */
function onGmailMessage(e) {
  var settings = getSettings_();
  try {
    var saved = loadAnalysis_(settings, e.gmail.messageId);
    if (saved) return renderAnalysis_(e.gmail.messageId, saved, settings);
  } catch (err) {
    // Fall back to the normal card below.
  }
  var button = primaryButton_('Analyze request', settings)
    .setOnClickAction(CardService.newAction().setFunctionName('onAnalyze'));
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      'Read this email as a transport request and price it from your history.'))
    .addWidget(button);
  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(settings, 'Transport requests'))
    .addSection(section);
  if (!settings.historySheetId) card.addSection(buildSetupSection_(settings));
  return card.build();
}

// ---- Actions ----------------------------------------------------------------

function onAnalyze(e) {
  var settings = getSettings_();
  var message = getMessage_(e);
  var request;
  try {
    request = extractRequest_(message.getSubject(), message.getFrom(), message.getPlainBody());
  } catch (err) {
    return notify_(err.message);
  }
  if (!request.is_transport_request) {
    return notify_('This email does not look like a transport request.');
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
    return notify_('Could not read the price history sheet: ' + err.message);
  }
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/** The saved analysis of the open email (see Requests.gs). */
function cachedRequest_(e) {
  var request = loadAnalysis_(getSettings_(), e.gmail.messageId);
  if (!request) throw new Error('Click Analyze request first.');
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
  var suggestion = suggestPrice_(similar);
  if (suggestion) CacheService.getUserCache().put('sugg:' + requestId, String(suggestion.sell), CACHE_SECONDS);
  var ranked = rankCarriers_(request, history, carriersTab);
  return buildAnalysisCard_(request, similar, suggestion, ranked, carriersTab, quotes, settings);
}

function buildAnalysisCard_(r, similar, suggestion, carriers, carriersTab, quotes, settings) {
  var route = [r.from_city, r.from_country].filter(String).join(', ') + ' → ' +
    [r.to_city, r.to_country].filter(String).join(', ');
  var load = [r.cargo, r.pallets != null ? r.pallets + ' pallets' : '',
    r.weight_kg != null ? r.weight_kg + ' kg' : ''].filter(String).join(' · ');

  var details = CardService.newCardSection().setHeader('Read from the email')
    .addWidget(iconField_('MAP_PIN', 'Route', route))
    .addWidget(iconField_('CLOCK', 'Loading', r.loading_date))
    .addWidget(iconField_('CLOCK', 'Delivery', r.delivery_date))
    .addWidget(iconField_('DESCRIPTION', 'Cargo', load))
    .addWidget(iconField_('CAR', 'Truck', r.truck_type));
  if (r.missing_info.length) {
    details.addWidget(iconField_('STAR', 'Missing', r.missing_info.join('; ')));
  }
  details.addWidget(CardService.newTextButton()
    .setText('Analyze again')
    .setOnClickAction(CardService.newAction().setFunctionName('onAnalyze')));

  var history = CardService.newCardSection().setHeader('Similar transports you have done')
    .setCollapsible(true).setNumUncollapsibleWidgets(2);
  if (!settings.historySheetId) {
    history.addWidget(CardService.newTextParagraph().setText('No price history sheet connected.'));
  } else if (similar.length === 0) {
    history.addWidget(CardService.newTextParagraph().setText(
      'No past transports on this country pair yet.'));
  } else {
    similar.forEach(function (h) {
      history.addWidget(iconField_('DOLLAR', h.from_city + ' → ' + h.to_city + ' · ' + h.truck_type + ' · ' + month_(h.date), '')
        .setText('Sold ' + eur_(h.sold_eur) + ' · Carrier ' + eur_(h.carrier_eur) +
          ' · Margin ' + eur_(h.sold_eur - h.carrier_eur))
        .setWrapText(true));
    });
  }

  var offer = CardService.newCardSection().setHeader('Your offer');
  if (suggestion) {
    offer.addWidget(CardService.newTextParagraph().setText(
      'Suggested: sell <b>' + eur_(suggestion.sell) + '</b>, expect carrier ~' +
      eur_(suggestion.carrier) + ', margin ~' + eur_(suggestion.margin) +
      ' (average of ' + suggestion.basedOn + ' similar transports).'));
  }
  offer
    .addWidget(CardService.newTextInput()
      .setFieldName('price')
      .setTitle('Offer price, EUR excl. VAT')
      .setValue(suggestion ? String(suggestion.sell) : ''))
    .addWidget(primaryButton_('Create reply draft', settings)
      .setComposeAction(
        CardService.newAction().setFunctionName('onCreateDraft'),
        CardService.ComposedEmailType.REPLY_AS_DRAFT));

  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(settings, 'Transport request · ' + routeLabel_(r)))
    .addSection(details)
    .addSection(history)
    .addSection(offer)
    .addSection(buildCarriersSection_(carriers, settings));
  if (settings.historySheetId) card.addSection(buildQuotesSection_(quotes, carriers, carriersTab));
  return card.addSection(buildOrderSection_(settings)).build();
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
  var section = CardService.newCardSection().setHeader('Carrier quotes');
  if (quotes.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText(
      'No quotes yet. Record prices carriers give you by email, Viber or phone.'));
  }
  quotes.forEach(function (q, i) {
    section.addWidget(iconField_('DOLLAR', '', '')
      .setText((i === 0 ? '<b>' : '') + q.carrier + ': ' + eur_(q.price_eur) + (i === 0 ? '</b> (cheapest)' : ''))
      .setBottomLabel(q.source + (q.date instanceof Date ? ' · ' + Utilities.formatDate(q.date,
        Session.getScriptTimeZone(), 'dd.MM HH:mm') : ''))
      .setWrapText(true));
  });

  var names = carrierChoices_(ranked, carriersTab);
  if (names.length === 0) return section;
  var carrierPick = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('quote_carrier')
    .setTitle('Carrier');
  names.forEach(function (name, i) { carrierPick.addItem(name, name, i === 0); });
  var sourcePick = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('quote_source')
    .setTitle('Received by');
  QUOTE_SOURCES.forEach(function (src, i) { sourcePick.addItem(src, src, i === 0); });

  return section
    .addWidget(carrierPick)
    .addWidget(CardService.newTextInput().setFieldName('quote_price').setTitle('Their price, EUR excl. VAT'))
    .addWidget(sourcePick)
    .addWidget(CardService.newTextButton()
      .setText('Save quote')
      .setOnClickAction(CardService.newAction().setFunctionName('onSaveQuote')));
}

function onSaveQuote(e) {
  var inputs = e.commonEventObject.formInputs || {};
  var carrier = inputs.quote_carrier ? inputs.quote_carrier.stringInputs.value[0] : '';
  var price = parsePrice_(inputs.quote_price ? inputs.quote_price.stringInputs.value[0] : '');
  var source = inputs.quote_source ? inputs.quote_source.stringInputs.value[0] : QUOTE_SOURCES[0];
  if (!carrier) return notify_('Choose a carrier.');
  if (price == null) return notify_('Enter the price as a number, e.g. 2080.');

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
    .setNotification(CardService.newNotification().setText('Saved ' + carrier + ': ' + eur_(price) + '.'))
    .build();
}

function buildOrderSection_(settings) {
  return CardService.newCardSection().setHeader('Order confirmed')
    .addWidget(CardService.newTextParagraph().setText(
      'When the client accepts and a carrier is confirmed: prepare both заявки, the emails, ' +
      'the transport folder, and add the transport to your history.'))
    .addWidget(primaryButton_('Prepare заявки', settings)
      .setOnClickAction(CardService.newAction().setFunctionName('onOrderConfirmed')));
}

/** "Иван Петров <ivan@x.bg>" -> {name, email} */
function parseSender_(from) {
  var m = String(from).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: '', email: String(from).trim() };
}

function onOrderConfirmed(e) {
  var settings = getSettings_();
  if (!settings.historySheetId) return notify_('Connect a price history sheet first.');
  var request, message, carriersTab, quotes, ranked;
  try {
    request = cachedRequest_(e);
    message = getMessage_(e);
    carriersTab = readCarriers_(settings.historySheetId);
    quotes = readQuotes_(settings.historySheetId, e.gmail.messageId);
    ranked = rankCarriers_(request, readHistory_(settings.historySheetId), carriersTab);
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
    .setTitle('Carrier');
  var names = carrierChoices_(ranked, carriersTab);
  var preselect = cheapest ? norm_(cheapest.carrier) : (names[0] ? norm_(names[0]) : '');
  names.forEach(function (name) { carrierPick.addItem(name, name, norm_(name) === preselect); });

  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      'Check the details, then create the заявки. Two drafts are created; nothing is sent.'))
    .addWidget(CardService.newTextInput().setFieldName('order_client')
      .setTitle('Client company (on the client заявка)').setValue(sender.name))
    .addWidget(CardService.newTextInput().setFieldName('order_sell')
      .setTitle('Agreed selling price, EUR excl. VAT').setValue(String(sell)))
    .addWidget(carrierPick)
    .addWidget(CardService.newTextInput().setFieldName('order_carrier_price')
      .setTitle('Carrier price, EUR excl. VAT').setValue(cheapest ? String(cheapest.price_eur) : ''))
    .addWidget(CardService.newTextInput().setFieldName('order_plates')
      .setTitle('Truck / trailer plates (optional)'))
    .addWidget(primaryButton_('Create заявки', settings)
      .setOnClickAction(CardService.newAction().setFunctionName('onCreateOrders')));
  if (names.length === 0) {
    section = CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(
      'Add your carriers to the Carriers tab of the price history sheet first.'));
  }

  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(settings, 'Order confirmed · ' + routeLabel_(request)))
    .addSection(section)
    .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function onCreateOrders(e) {
  var inputs = e.commonEventObject.formInputs || {};
  var get = function (name) { return inputs[name] ? inputs[name].stringInputs.value[0].trim() : ''; };
  var sell = parsePrice_(get('order_sell'));
  var carrierPrice = parsePrice_(get('order_carrier_price'));
  if (!get('order_client')) return notify_('Enter the client company.');
  if (sell == null) return notify_('Enter the agreed selling price as a number.');
  if (carrierPrice == null) return notify_('Enter the carrier price as a number.');

  var settings = getSettings_();
  var folder;
  try {
    var request = cachedRequest_(e);
    var message = getMessage_(e);
    var carrier = readCarriers_(settings.historySheetId).filter(function (c) {
      return norm_(c.carrier) === norm_(get('order_carrier'));
    })[0];
    if (!carrier) return notify_('Choose a carrier from the list.');
    if (!String(carrier.email || '').trim()) {
      return notify_(carrier.carrier + ' has no email on the Carriers tab. Add it and try again.');
    }
    var sender = parseSender_(message.getFrom());
    var order = {
      number: nextOrderNumber_(SpreadsheetApp.openById(settings.historySheetId)),
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
      truck_type: request.truck_type
    };
    folder = createOrderDocuments_(order, message, settings);
  } catch (err) {
    return notify_('Could not create the заявки: ' + err.message);
  }

  var done = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      '<b>Order ' + order.number + '</b> is ready:<br>' +
      '• Reply to the client with their заявка (' + eur_(sell) + ') in Drafts<br>' +
      '• Email to ' + order.carrier_name + ' with their заявка (' + eur_(carrierPrice) + ') in Drafts<br>' +
      '• Transport folder in Drive<br>' +
      '• Added to your price history<br><br>' +
      'Check the drafts and PDFs before sending.'))
    .addWidget(CardService.newTextButton()
      .setText('Open transport folder')
      .setOpenLink(CardService.newOpenLink().setUrl(folder.getUrl())));
  var card = CardService.newCardBuilder()
    .setHeader(brandHeader_(settings, 'Order ' + order.number + ' · заявки created'))
    .addSection(done)
    .build();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function buildCarriersSection_(carriers, settings) {
  var section = CardService.newCardSection().setHeader('Carriers for this route');
  if (!settings.historySheetId || carriers.length === 0) {
    return section.addWidget(CardService.newTextParagraph().setText(
      'No carriers on this country pair yet. Add a carrier column to your history ' +
      'and a Carriers tab with their contacts.'));
  }

  var withEmail = 0;
  var pick = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setFieldName('carriers')
    .setTitle('Ask for a price');
  carriers.forEach(function (c) {
    var b = c.best;
    section.addWidget(iconField_('PERSON', '', '')
      .setTopLabel([c.contact, c.phone].filter(String).join(' · ') || 'No contact details')
      .setText('<b>' + c.name + '</b>')
      .setBottomLabel(b.from_city + ' → ' + b.to_city + ' · ' + b.truck_type + ' · ' + month_(b.date) +
        ': ' + eur_(b.carrier_eur) + ' · ' + c.runs + (c.runs === 1 ? ' run' : ' runs') + ' on this route')
      .setWrapText(true));
    if (c.email) {
      pick.addItem(c.name, c.key, withEmail < PRESELECT_CARRIERS);
      withEmail += 1;
    }
  });

  if (withEmail === 0) {
    return section.addWidget(CardService.newTextParagraph().setText(
      'None of these carriers has an email on the Carriers tab.'));
  }
  return section
    .addWidget(pick)
    .addWidget(primaryButton_('Draft price requests', settings)
      .setOnClickAction(CardService.newAction().setFunctionName('onDraftCarrierRequests')));
}

/** Creates one price request draft per ticked carrier. Never sends. */
function onDraftCarrierRequests(e) {
  var inputs = e.commonEventObject.formInputs || {};
  var picked = inputs.carriers ? inputs.carriers.stringInputs.value : [];
  if (picked.length === 0) return notify_('Tick at least one carrier.');

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
  return notify_('Created ' + chosen.length + (chosen.length === 1 ? ' draft' : ' drafts') +
    ' in your Drafts folder. Check them before sending.');
}

/** Writes the offer with Claude and opens it as a reply draft. Never sends. */
function onCreateDraft(e) {
  var inputs = e.commonEventObject.formInputs || {};
  var price = inputs.price ? inputs.price.stringInputs.value[0].trim() : '';
  if (!/^\d+([.,]\d+)?$/.test(price)) {
    throw new Error('Enter the offer price as a number, e.g. 2500.');
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
