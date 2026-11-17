/**
 * Order confirmed: creates the two заявки and everything around them.
 *
 * 1. Gives the order a running number (2026-0001, 2026-0002, ...).
 * 2. Fills the client's заявка (selling price) and the carrier's заявка (carrier
 *    price) from Google Docs templates and saves both as PDFs.
 * 3. Drafts a reply to the client asking for their signed заявка, and an email to
 *    the carrier, each with its PDF attached. Nothing is sent.
 * 4. Creates a Drive folder for the transport with the заявки, the client email
 *    thread as a PDF and an order summary.
 * 5. Adds the transport to the History tab, so future suggestions learn from it.
 *
 * Templates: starter templates are created in the company's "Freight Assistant"
 * folder. Edit them freely (logo, terms, layout) or replace them with your own:
 * any Google Doc using the {{placeholders}} below works. Their IDs are on the
 * company sheet's Settings tab (CLIENT_TEMPLATE_ID, CARRIER_TEMPLATE_ID).
 *
 * Placeholders: {{order_number}} {{date}} {{company}} {{client}} {{carrier}}
 * {{carrier_contact}} {{truck_plates}} {{loading_place}} {{loading_date}}
 * {{unloading_place}} {{delivery_date}} {{cargo}} {{pallets}} {{weight}}
 * {{truck_type}} {{price}} {{payment_terms}}
 * The client's document never gets the carrier or the carrier price, and the
 * carrier's never gets the client or the selling price (see buildOrderFields_).
 */

var ROOT_FOLDER = 'Freight Assistant';
var TRANSPORTS_FOLDER = 'Transports';

var TRUCK_LABELS_BG = {
  curtainsider: 'Тент 13,6 м', reefer: 'Хладилен', mega: 'Мега', box: 'Фургон',
  flatbed: 'Платформа', other: 'Друг', unknown: ''
};

// ---- Pure helpers (tested in test/orders.test.js) ----------------------------

function formatOrderNumber_(year, n) {
  return year + '-' + ('000' + n).slice(-4);
}

function joinParts_(parts) {
  return parts.filter(function (p) { return p != null && String(p).trim() !== ''; }).join(', ');
}

function priceText_(n) {
  return String(Math.round(Number(n) * 100) / 100).replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' EUR';
}

/**
 * The values for one document. `side` is 'client' or 'carrier'. Each side picks
 * its own fields explicitly, so one side's price and party never reach the other.
 */
function buildOrderFields_(order, side, settings) {
  var fields = {
    order_number: order.number,
    date: order.date,
    company: settings.companyName || '',
    loading_place: joinParts_([order.from_address, order.from_city, order.from_country]),
    loading_date: order.loading_date || '',
    unloading_place: joinParts_([order.to_address, order.to_city, order.to_country]),
    delivery_date: order.delivery_date || '',
    cargo: order.cargo || '',
    pallets: order.pallets != null ? String(order.pallets) : '',
    weight: order.weight_kg != null ? order.weight_kg + ' кг' : '',
    truck_type: TRUCK_LABELS_BG[order.truck_type] != null ? TRUCK_LABELS_BG[order.truck_type] : (order.truck_type || ''),
    truck_plates: order.plates || ''
  };
  if (side === 'client') {
    fields.client = order.client_name;
    fields.price = priceText_(order.sell_eur);
    fields.payment_terms = settings.clientPaymentTerms || '';
  } else if (side === 'carrier') {
    fields.carrier = order.carrier_name;
    fields.carrier_contact = order.carrier_contact || '';
    fields.price = priceText_(order.carrier_eur);
    fields.payment_terms = settings.carrierPaymentTerms || '';
  } else {
    throw new Error('Unknown side: ' + side);
  }
  return fields;
}

/** A History tab row for the confirmed order, in the tab's own column order. */
function historyRowFor_(headers, order) {
  var values = {
    date: order.loading_date || order.date,
    from_city: order.from_city, from_country: order.from_country,
    to_city: order.to_city, to_country: order.to_country,
    truck_type: order.truck_type,
    sold_eur: order.sell_eur, carrier_eur: order.carrier_eur,
    carrier: order.carrier_name, order_number: order.number
  };
  return headers.map(function (h) {
    var v = values[String(h).trim().toLowerCase()];
    return v == null ? '' : v;
  });
}

function orderFolderName_(order) {
  return order.number + ' ' + (order.from_city || order.from_country) + '–' + (order.to_city || order.to_country);
}

function orderEmailText_(language) {
  return CONFIG.ORDER_EMAILS[language] || CONFIG.ORDER_EMAILS.en;
}

function greetingFor_(language, name) {
  var t = CONFIG.ACK_TEMPLATES[language] || CONFIG.ACK_TEMPLATES.en;
  return name ? t.greetingWithName.replace('{name}', name) : t.greeting;
}

function closingFor_(language) {
  return (CONFIG.ACK_TEMPLATES[language] || CONFIG.ACK_TEMPLATES.en).closing;
}

function buildClientOrderEmail_(order, signature) {
  var lang = order.language;
  var lines = [greetingFor_(lang, order.client_contact), '', orderEmailText_(lang).client, '', closingFor_(lang)];
  if (signature) lines.push(signature);
  return lines.join('\n');
}

function buildCarrierOrderEmail_(order, signature) {
  var lang = order.carrier_language;
  var t = orderEmailText_(lang);
  var lines = [greetingFor_(lang, order.carrier_contact), '', t.carrier.replace('{order}', order.number), '', closingFor_(lang)];
  if (signature) lines.push(signature);
  return {
    subject: t.carrierSubject.replace('{order}', order.number)
      .replace('{route}', routeLabel_(order) + (order.loading_date ? ', ' + order.loading_date : '')),
    body: lines.join('\n')
  };
}

function orderSummaryText_(order) {
  return [
    'Order ' + order.number + ' (' + order.date + ')',
    'Route: ' + routeLabel_(order),
    'Loading: ' + joinParts_([order.from_address, order.from_city, order.from_country]) + ' · ' + (order.loading_date || '—'),
    'Unloading: ' + joinParts_([order.to_address, order.to_city, order.to_country]) + ' · ' + (order.delivery_date || '—'),
    'Cargo: ' + joinParts_([order.cargo, order.pallets != null ? order.pallets + ' pallets' : '',
      order.weight_kg != null ? order.weight_kg + ' kg' : '']),
    'Truck: ' + joinParts_([order.truck_type, order.plates]),
    '',
    'Client: ' + order.client_name + ' <' + order.client_email + '>',
    'Selling price: ' + priceText_(order.sell_eur),
    'Carrier: ' + order.carrier_name + ' <' + order.carrier_email + '>',
    'Carrier price: ' + priceText_(order.carrier_eur),
    'Margin: ' + priceText_(order.sell_eur - order.carrier_eur)
  ].join('\n');
}

// ---- Google services --------------------------------------------------------

/** Run from the editor to check the templates exist and see their links. */
function setUpTemplates() {
  var sheetId = getCompanySheetId_();
  if (!sheetId) throw new Error('Set up your company in the Gmail sidebar first.');
  var ids = ensureTemplates_(SpreadsheetApp.openById(sheetId));
  console.log('Client заявка template: https://docs.google.com/document/d/' + ids.client + '/edit');
  console.log('Carrier заявка template: https://docs.google.com/document/d/' + ids.carrier + '/edit');
}

/** The company's next order number, from its Settings tab. */
function nextOrderNumber_(ss) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var s = readCompanySettings_(ss);
    var state = nextOrderState_(s.NEXT_ORDER_NUMBER, s.ORDER_NUMBER_YEAR, new Date().getFullYear());
    writeCompanySetting_(ss, 'NEXT_ORDER_NUMBER', String(state.next));
    writeCompanySetting_(ss, 'ORDER_NUMBER_YEAR', String(state.year));
    return state.number;
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function rootFolder_() {
  return getOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER);
}

/**
 * The company's template, created if it has none (or it was deleted). If it exists
 * but this user can't open it, that's a sharing problem: never replace the
 * company's template with a new one because of it.
 */
function ensureTemplate_(ss, key, name, lines) {
  var id = readCompanySettings_(ss)[key];
  if (id) {
    var file;
    try {
      file = DriveApp.getFileById(id);
    } catch (err) {
      throw new Error(t_('template_access'));
    }
    if (!file.isTrashed()) return id;
  }
  id = createTemplate_(name, lines, companyFolder_(ss));
  writeCompanySetting_(ss, key, id);
  return id;
}

function ensureTemplates_(ss) {
  return {
    client: ensureTemplate_(ss, 'CLIENT_TEMPLATE_ID', 'Freight Assistant – шаблон заявка клиент', CLIENT_TEMPLATE_LINES),
    carrier: ensureTemplate_(ss, 'CARRIER_TEMPLATE_ID', 'Freight Assistant – шаблон заявка превозвач', CARRIER_TEMPLATE_LINES)
  };
}

var CLIENT_TEMPLATE_LINES = [
  ['title', 'ЗАЯВКА ЗА ТРАНСПОРТ № {{order_number}}'],
  ['text', 'Дата: {{date}}'],
  ['text', ''],
  ['text', 'Възложител: {{client}}'],
  ['text', 'Изпълнител: {{company}}'],
  ['text', ''],
  ['text', 'Място на товарене: {{loading_place}}'],
  ['text', 'Дата на товарене: {{loading_date}}'],
  ['text', 'Място на разтоварване: {{unloading_place}}'],
  ['text', 'Срок за доставка: {{delivery_date}}'],
  ['text', 'Стока: {{cargo}}'],
  ['text', 'Палети: {{pallets}}   Тегло: {{weight}}'],
  ['text', 'Вид на камиона: {{truck_type}}   Рег. номер: {{truck_plates}}'],
  ['text', ''],
  ['text', 'Навло: {{price}}, без ДДС'],
  ['text', 'Плащане: {{payment_terms}}'],
  ['text', ''],
  ['text', 'Възложител: ………………………… (подпис и печат)']
];

var CARRIER_TEMPLATE_LINES = [
  ['title', 'ЗАЯВКА КЪМ ПРЕВОЗВАЧ № {{order_number}}'],
  ['text', 'Дата: {{date}}'],
  ['text', ''],
  ['text', 'Възложител: {{company}}'],
  ['text', 'Превозвач: {{carrier}}'],
  ['text', 'Лице за контакт: {{carrier_contact}}'],
  ['text', 'Камион / ремарке: {{truck_plates}}'],
  ['text', ''],
  ['text', 'Място на товарене: {{loading_place}}'],
  ['text', 'Дата на товарене: {{loading_date}}'],
  ['text', 'Място на разтоварване: {{unloading_place}}'],
  ['text', 'Срок за доставка: {{delivery_date}}'],
  ['text', 'Стока: {{cargo}}'],
  ['text', 'Палети: {{pallets}}   Тегло: {{weight}}'],
  ['text', 'Вид на камиона: {{truck_type}}'],
  ['text', ''],
  ['text', 'Навло: {{price}}, без ДДС'],
  ['text', 'Условия: превозът се извършва по Конвенция CMR. Плащане: {{payment_terms}}.'],
  ['text', ''],
  ['text', 'Възложител: …………………………        Превозвач: …………………………']
];

function createTemplate_(name, lines, folder) {
  var doc = DocumentApp.create(name);
  var body = doc.getBody();
  body.clear();
  lines.forEach(function (line, i) {
    var para;
    if (i === 0) {
      // A new document starts with one empty paragraph: use it for the first line.
      // (Paragraph.setText returns nothing, so keep the paragraph itself.)
      para = body.getParagraphs()[0];
      para.setText(line[1]);
    } else {
      para = body.appendParagraph(line[1]);
    }
    if (line[0] === 'title') {
      para.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }
  });
  doc.saveAndClose();
  var file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  return doc.getId();
}

/** Copies a template into the folder, fills the placeholders, returns the PDF blob. */
function fillTemplate_(templateId, fields, name, folder) {
  var copy = DriveApp.getFileById(templateId).makeCopy(name, folder);
  var doc = DocumentApp.openById(copy.getId());
  [doc.getBody(), doc.getHeader(), doc.getFooter()].forEach(function (section) {
    if (!section) return;
    Object.keys(fields).forEach(function (key) {
      section.replaceText('\\{\\{' + key + '\\}\\}', String(fields[key]));
    });
    // Placeholders this side has no value for (e.g. {{carrier}} in the client's
    // template) are left blank, never filled with the other side's data.
    section.replaceText('\\{\\{[a-z_]+\\}\\}', '');
  });
  doc.saveAndClose();
  var pdf = copy.getAs('application/pdf').setName(name + '.pdf');
  folder.createFile(pdf);
  return pdf;
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The client's email thread as a PDF. */
function threadPdf_(thread, name) {
  var html = '<h2>' + escapeHtml_(thread.getFirstMessageSubject()) + '</h2>' +
    thread.getMessages().map(function (m) {
      return '<hr><p><b>' + escapeHtml_(m.getFrom()) + '</b><br>' + escapeHtml_(m.getDate()) + '</p>' +
        '<pre style="white-space:pre-wrap;font-family:sans-serif">' + escapeHtml_(m.getPlainBody()) + '</pre>';
    }).join('');
  return Utilities.newBlob(html, 'text/html', name + '.html').getAs('application/pdf').setName(name + '.pdf');
}

function appendToHistory_(ss, order) {
  var sheet = historySheet_(ss);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(historyRowFor_(headers, order));
}

/**
 * Does everything for a confirmed order. `message` is the client's request email.
 * Returns the transport folder.
 */
function createOrderDocuments_(order, message, settings) {
  var ss = SpreadsheetApp.openById(settings.historySheetId);
  var templates = ensureTemplates_(ss);
  // Only now take a number, so a template problem never uses one up.
  order.number = nextOrderNumber_(ss);
  var folder = getOrCreateFolder_(getOrCreateFolder_(companyFolder_(ss), TRANSPORTS_FOLDER), orderFolderName_(order));

  var clientPdf = fillTemplate_(templates.client, buildOrderFields_(order, 'client', settings),
    'Заявка ' + order.number + ' – клиент', folder);
  var carrierPdf = fillTemplate_(templates.carrier, buildOrderFields_(order, 'carrier', settings),
    'Заявка ' + order.number + ' – превозвач', folder);

  folder.createFile(threadPdf_(message.getThread(), 'Кореспонденция клиент ' + order.number));
  folder.createFile('Order summary ' + order.number + '.txt', orderSummaryText_(order));

  message.createDraftReply(buildClientOrderEmail_(order, settings.signature), { attachments: [clientPdf] });
  var carrierEmail = buildCarrierOrderEmail_(order, settings.signature);
  GmailApp.createDraft(order.carrier_email, carrierEmail.subject, carrierEmail.body, { attachments: [carrierPdf] });

  appendToHistory_(ss, order);
  return folder;
}
