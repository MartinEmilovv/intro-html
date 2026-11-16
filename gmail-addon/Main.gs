/**
 * Gmail sidebar: the cards the forwarder sees, and what each button does.
 *
 * Flow: open an email -> "Analyze request" -> details, similar past transports
 * and a suggested price -> adjust the price -> "Create reply draft", which opens
 * the offer as a Gmail reply draft. Nothing is ever sent automatically.
 */

var CACHE_SECONDS = 6 * 60 * 60;

function getSettings_() {
  var p = PropertiesService.getScriptProperties();
  var get = function (name) { return p.getProperty(name) || CONFIG[name]; };
  return {
    historySheetId: get('HISTORY_SHEET_ID'),
    signature: get('SIGNATURE'),
    offerTerms: get('OFFER_TERMS')
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
      'Open a transport request email and click <b>Analyze request</b>.'))
    .addWidget(field_('Claude API key', hasKey ? 'Set' : 'Missing: add ANTHROPIC_API_KEY'))
    .addWidget(field_('Price history sheet', s.historySheetId ? 'Connected' : 'Missing: add HISTORY_SHEET_ID'));
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Freight Assistant'))
    .addSection(section)
    .build();
}

/** Shown when an email is opened. Claude is only called when the button is clicked. */
function onGmailMessage(e) {
  var button = CardService.newTextButton()
    .setText('Analyze request')
    .setOnClickAction(CardService.newAction().setFunctionName('onAnalyze'));
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      'Read this email as a transport request and price it from your history.'))
    .addWidget(button);
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Freight Assistant'))
    .addSection(section)
    .build();
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

  var similar = [];
  var carriers = [];
  if (settings.historySheetId) {
    try {
      var history = readHistory_(settings.historySheetId);
      similar = findSimilar_(request, history);
      carriers = rankCarriers_(request, history, readCarriers_(settings.historySheetId));
    } catch (err) {
      return notify_('Could not read the price history sheet: ' + err.message);
    }
  }
  var suggestion = suggestPrice_(similar);

  CacheService.getUserCache().put('req:' + e.gmail.messageId, JSON.stringify(request), CACHE_SECONDS);

  var card = buildAnalysisCard_(request, similar, suggestion, carriers, settings);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function buildAnalysisCard_(r, similar, suggestion, carriers, settings) {
  var route = [r.from_city, r.from_country].filter(String).join(', ') + ' → ' +
    [r.to_city, r.to_country].filter(String).join(', ');
  var load = [r.cargo, r.pallets != null ? r.pallets + ' pallets' : '',
    r.weight_kg != null ? r.weight_kg + ' kg' : ''].filter(String).join(' · ');

  var details = CardService.newCardSection().setHeader('Read from the email')
    .addWidget(field_('Route', route))
    .addWidget(field_('Loading', r.loading_date))
    .addWidget(field_('Delivery', r.delivery_date))
    .addWidget(field_('Cargo', load))
    .addWidget(field_('Truck', r.truck_type));
  if (r.missing_info.length) {
    details.addWidget(field_('Missing', r.missing_info.join('; ')));
  }

  var history = CardService.newCardSection().setHeader('Similar transports you have done');
  if (!settings.historySheetId) {
    history.addWidget(CardService.newTextParagraph().setText('No price history sheet connected.'));
  } else if (similar.length === 0) {
    history.addWidget(CardService.newTextParagraph().setText(
      'No past transports on this country pair yet.'));
  } else {
    similar.forEach(function (h) {
      history.addWidget(CardService.newDecoratedText()
        .setTopLabel(h.from_city + ' → ' + h.to_city + ' · ' + h.truck_type + ' · ' + month_(h.date))
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
    .addWidget(CardService.newTextButton()
      .setText('Create reply draft')
      .setComposeAction(
        CardService.newAction().setFunctionName('onCreateDraft'),
        CardService.ComposedEmailType.REPLY_AS_DRAFT));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Transport request'))
    .addSection(details)
    .addSection(history)
    .addSection(offer)
    .addSection(buildCarriersSection_(carriers, settings))
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
    section.addWidget(CardService.newDecoratedText()
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
    .addWidget(CardService.newTextButton()
      .setText('Draft price requests')
      .setOnClickAction(CardService.newAction().setFunctionName('onDraftCarrierRequests')));
}

/** Creates one price request draft per ticked carrier. Never sends. */
function onDraftCarrierRequests(e) {
  var inputs = e.commonEventObject.formInputs || {};
  var picked = inputs.carriers ? inputs.carriers.stringInputs.value : [];
  if (picked.length === 0) return notify_('Tick at least one carrier.');

  var cached = CacheService.getUserCache().get('req:' + e.gmail.messageId);
  if (!cached) return notify_('The analysis expired. Click Analyze request again.');
  var request = JSON.parse(cached);

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
  var cached = CacheService.getUserCache().get('req:' + e.gmail.messageId);
  if (!cached) throw new Error('The analysis expired. Click Analyze request again.');

  var body = draftOffer_(JSON.parse(cached), price, message.getPlainBody(), getSettings_());
  var draft = message.createDraftReply(body);
  return CardService.newComposeActionResponseBuilder().setGmailDraft(draft).build();
}
