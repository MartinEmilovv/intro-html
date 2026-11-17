/**
 * Company workspace: where each company's data and settings live.
 *
 * - Per company, in the company's own Google Sheet (tabs History, Carriers, Quotes,
 *   Settings) and Drive folder: price history, carriers, quotes, company name,
 *   terms, template IDs and the order counter. Colleagues share the sheet and the
 *   "Freight Assistant" folder through normal Google sharing.
 * - Per person (User Properties): which company sheet they use, and their signature.
 * - Per deployment (Script Properties): only ANTHROPIC_API_KEY.
 *
 * So two companies using the add-on never share data, settings or order numbers.
 */

var HISTORY_TAB = 'History';
var SETTINGS_TAB = 'Settings';
var HISTORY_HEADER = ['date', 'from_city', 'from_country', 'to_city', 'to_country', 'truck_type',
  'sold_eur', 'carrier_eur', 'carrier', 'order_number'];
var CARRIERS_HEADER = ['carrier', 'contact_person', 'email', 'phone', 'language'];
var SETTINGS_HEADER = ['setting', 'value', 'what it is'];

/** Company settings on the Settings tab: [key, default, description]. */
function companySettingDefs_() {
  return [
    ['COMPANY_NAME', '', 'Your company name, as it appears on the заявки'],
    ['ASSISTANT_NAME', '', 'Name shown at the top of the sidebar, e.g. "Orbit Assistant" (empty = Freight Assistant)'],
    ['LOGO_URL', '', 'Link to your logo image (https, PNG or JPG), shown at the top of the sidebar'],
    ['BRAND_COLOR', '', 'Color of the main buttons, e.g. #1d5b86'],
    ['OFFER_TERMS', CONFIG.OFFER_TERMS, 'Terms added to price offers'],
    ['CLIENT_PAYMENT_TERMS', CONFIG.CLIENT_PAYMENT_TERMS, 'Payment terms on the client заявка'],
    ['CARRIER_PAYMENT_TERMS', CONFIG.CARRIER_PAYMENT_TERMS, 'Payment terms on the carrier заявка'],
    ['CLIENT_TEMPLATE_ID', '', 'Google Doc used for client заявки (filled in automatically)'],
    ['CARRIER_TEMPLATE_ID', '', 'Google Doc used for carrier заявки (filled in automatically)'],
    ['NEXT_ORDER_NUMBER', '1', 'Next running order number (filled in automatically)'],
    ['ORDER_NUMBER_YEAR', '', 'Year of the order counter (filled in automatically)']
  ];
}

// ---- Pure helpers (tested in test/setup.test.js) -----------------------------

/** The sheet ID from a Google Sheets link, or the ID itself; null if neither. */
function parseSheetId_(text) {
  var t = String(text || '').trim();
  var m = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(t) ? t : null;
}

/** Settings tab rows (with header) -> {KEY: 'value'}. */
function settingsFromRows_(rows) {
  var out = {};
  rows.slice(1).forEach(function (r) {
    var key = String(r[0] || '').trim();
    if (key) out[key] = r[1] == null ? '' : String(r[1]).trim();
  });
  return out;
}

/** Order counter: the number to use now and what to store. Restarts each year. */
function nextOrderState_(storedNext, storedYear, year) {
  var n = Number(storedNext) || 1;
  if (Number(storedYear) !== year) n = 1;
  return { number: formatOrderNumber_(year, n), next: n + 1, year: year };
}

// ---- Who uses which company --------------------------------------------------

function getCompanySheetId_() {
  return PropertiesService.getUserProperties().getProperty('HISTORY_SHEET_ID') || '';
}

function getSignature_() {
  return PropertiesService.getUserProperties().getProperty('SIGNATURE') || '';
}

// ---- Company sheet -----------------------------------------------------------

function historySheet_(ss) {
  return ss.getSheetByName(HISTORY_TAB) || ss.getSheets()[0];
}

function ensureTab_(ss, name, header) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Makes sure every tab exists and the Settings tab has every setting. */
function ensureCompanyTabs_(ss) {
  if (!ss.getSheetByName(HISTORY_TAB)) {
    var first = ss.getSheets()[0];
    if (first.getLastRow() === 0) {
      first.setName(HISTORY_TAB);
      first.appendRow(HISTORY_HEADER);
      first.setFrozenRows(1);
    }
    // An existing first tab with data is treated as the history (see historySheet_).
  }
  ensureTab_(ss, CARRIERS_TAB, CARRIERS_HEADER);
  ensureTab_(ss, QUOTES_TAB, QUOTES_HEADER);
  ensureTab_(ss, REQUESTS_TAB, REQUESTS_HEADER);
  var settings = ensureTab_(ss, SETTINGS_TAB, SETTINGS_HEADER);
  var have = settingsFromRows_(settings.getDataRange().getValues());
  companySettingDefs_().forEach(function (d) {
    if (!(d[0] in have)) settings.appendRow([d[0], d[1], d[2]]);
  });
}

function readCompanySettings_(ss) {
  var sheet = ss.getSheetByName(SETTINGS_TAB);
  return sheet ? settingsFromRows_(sheet.getDataRange().getValues()) : {};
}

function writeCompanySetting_(ss, key, value) {
  var sheet = ensureTab_(ss, SETTINGS_TAB, SETTINGS_HEADER);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value, '']);
}

/** The company's Drive folder: the folder holding its sheet, if this user can open it. */
function companyFolder_(ss) {
  try {
    var parents = DriveApp.getFileById(ss.getId()).getParents();
    if (parents.hasNext()) return parents.next();
  } catch (err) {
    // Not shared with this user: fall back to their own folder.
  }
  return rootFolder_();
}

// ---- Create or join ------------------------------------------------------------

/** New company: sheet with all tabs, templates and folder in this user's Drive. */
function createWorkspace_() {
  var ss = SpreadsheetApp.create('Freight Assistant – company data');
  DriveApp.getFileById(ss.getId()).moveTo(rootFolder_());
  ensureCompanyTabs_(ss);
  PropertiesService.getUserProperties().setProperty('HISTORY_SHEET_ID', ss.getId());
  ensureTemplates_(ss);
  return ss;
}

/** Existing company sheet (a colleague's, or one set up before this version). */
function joinWorkspace_(linkOrId) {
  var id = parseSheetId_(linkOrId);
  if (!id) throw new Error(t_('paste_link'));
  var ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (err) {
    throw new Error(t_('cant_open_sheet'));
  }
  ensureCompanyTabs_(ss);
  migrateLegacySettings_(ss);
  PropertiesService.getUserProperties().setProperty('HISTORY_SHEET_ID', id);
  return ss;
}

/**
 * Earlier versions kept template IDs, the order counter and the signature in
 * Script Properties, shared by every user. Moves them to the first company sheet
 * set up after updating, then deletes them so no other company inherits them.
 */
function migrateLegacySettings_(ss) {
  var sp = PropertiesService.getScriptProperties();
  var have = readCompanySettings_(ss);
  ['CLIENT_TEMPLATE_ID', 'CARRIER_TEMPLATE_ID', 'NEXT_ORDER_NUMBER', 'ORDER_NUMBER_YEAR',
    'COMPANY_NAME', 'OFFER_TERMS', 'CLIENT_PAYMENT_TERMS', 'CARRIER_PAYMENT_TERMS'].forEach(function (key) {
    var legacy = sp.getProperty(key);
    if (legacy == null) return;
    var isDefault = companySettingDefs_().some(function (d) { return d[0] === key && d[1] === have[key]; });
    if (!have[key] || isDefault) writeCompanySetting_(ss, key, legacy);
    sp.deleteProperty(key);
  });
  ['SIGNATURE', 'HISTORY_SHEET_ID'].forEach(function (key) {
    var legacy = sp.getProperty(key);
    if (legacy == null) return;
    if (key === 'SIGNATURE' && !getSignature_()) {
      PropertiesService.getUserProperties().setProperty('SIGNATURE', legacy);
    }
    sp.deleteProperty(key);
  });
}

// ---- Setup cards and actions ---------------------------------------------------

function buildSetupSection_(settings) {
  return CardService.newCardSection().setHeader(t_('setup_header'))
    .addWidget(CardService.newTextParagraph().setText(t_('setup_intro')))
    .addWidget(primaryButton_(t_('create_workspace'), settings)
      .setOnClickAction(CardService.newAction().setFunctionName('onCreateWorkspace')))
    .addWidget(CardService.newTextParagraph().setText(t_('or_join')))
    .addWidget(CardService.newTextInput().setFieldName('sheet_link').setTitle(t_('sheet_link')))
    .addWidget(CardService.newTextButton()
      .setText(t_('use_sheet'))
      .setOnClickAction(CardService.newAction().setFunctionName('onJoinWorkspace')));
}

/** The fields editable from the sidebar: [Settings key, settings property]. Labels: set_* in I18n.gs. */
var EDITABLE_COMPANY_SETTINGS = [
  ['COMPANY_NAME', 'companyName'],
  ['ASSISTANT_NAME', 'assistantName'],
  ['LOGO_URL', 'logoUrl'],
  ['BRAND_COLOR', 'brandColor'],
  ['OFFER_TERMS', 'offerTerms'],
  ['CLIENT_PAYMENT_TERMS', 'clientPaymentTerms'],
  ['CARRIER_PAYMENT_TERMS', 'carrierPaymentTerms']
];

/**
 * Checks the company settings typed in the sidebar. Returns {values: {KEY: value}}
 * or {error: 'what to fix'}. Empty logo/color are allowed (= no logo, default color).
 */
function validateCompanySettings_(input) {
  var values = {};
  EDITABLE_COMPANY_SETTINGS.forEach(function (f) { values[f[0]] = String(input[f[0]] || '').trim(); });
  if (values.LOGO_URL && !safeLogoUrl_(values.LOGO_URL)) {
    return { error: t_('logo_https') };
  }
  if (values.BRAND_COLOR) {
    var color = safeColor_(values.BRAND_COLOR);
    var typed = values.BRAND_COLOR.replace(/^#/, '').toLowerCase();
    if (color === DEFAULT_BRAND_COLOR && typed !== DEFAULT_BRAND_COLOR.slice(1)) {
      return { error: t_('color_hex') };
    }
    values.BRAND_COLOR = color;
  }
  if (values.ASSISTANT_NAME.length > 40) return { error: t_('name_too_long') };
  return { values: values };
}

function buildWorkspaceSection_(settings) {
  var url = 'https://docs.google.com/spreadsheets/d/' + settings.historySheetId + '/edit';
  var section = CardService.newCardSection().setHeader(t_('company_settings'))
    .setCollapsible(true).setNumUncollapsibleWidgets(2)
    .addWidget(iconField_('STORE', t_('company'), settings.companyName || t_('company_not_set')))
    .addWidget(CardService.newTextButton()
      .setText(t_('open_sheet'))
      .setOpenLink(CardService.newOpenLink().setUrl(url)));
  EDITABLE_COMPANY_SETTINGS.forEach(function (f) {
    section.addWidget(CardService.newTextInput()
      .setFieldName('company_' + f[0])
      .setTitle(t_('set_' + f[0]))
      .setValue(settings[f[1]] || ''));
  });
  return section
    .addWidget(primaryButton_(t_('save_company'), settings)
      .setOnClickAction(CardService.newAction().setFunctionName('onSaveCompanySettings')))
    .addWidget(CardService.newTextParagraph().setText(t_('company_note')));
}

function buildSignatureSection_(settings) {
  return CardService.newCardSection().setHeader(t_('signature_header'))
    .addWidget(CardService.newTextInput()
      .setFieldName('signature')
      .setTitle(t_('signature_title'))
      .setMultiline(true)
      .setValue(settings.signature || ''))
    .addWidget(CardService.newTextButton()
      .setText(t_('save_signature'))
      .setOnClickAction(CardService.newAction().setFunctionName('onSaveSignature')));
}

function onSaveCompanySettings(e) {
  var inputs = e.commonEventObject.formInputs || {};
  var typed = {};
  EDITABLE_COMPANY_SETTINGS.forEach(function (f) {
    var field = inputs['company_' + f[0]];
    typed[f[0]] = field ? field.stringInputs.value[0] : '';
  });
  var checked = validateCompanySettings_(typed);
  if (checked.error) return notify_(checked.error);
  try {
    var ss = SpreadsheetApp.openById(getCompanySheetId_());
    Object.keys(checked.values).forEach(function (key) {
      writeCompanySetting_(ss, key, checked.values[key]);
    });
  } catch (err) {
    return notify_(t_('save_failed', { error: err.message }));
  }
  return refreshHomepage_(t_('company_saved'));
}

function onCreateWorkspace(e) {
  try {
    createWorkspace_();
  } catch (err) {
    return notify_(t_('workspace_failed', { error: err.message }));
  }
  return refreshHomepage_(t_('workspace_created'));
}

function onJoinWorkspace(e) {
  var inputs = e.commonEventObject.formInputs || {};
  var link = inputs.sheet_link ? inputs.sheet_link.stringInputs.value[0] : '';
  try {
    joinWorkspace_(link);
  } catch (err) {
    return notify_(err.message);
  }
  return refreshHomepage_(t_('joined'));
}

function onSaveSignature(e) {
  var inputs = e.commonEventObject.formInputs || {};
  var text = inputs.signature ? inputs.signature.stringInputs.value[0] : '';
  PropertiesService.getUserProperties().setProperty('SIGNATURE', text.trim());
  return notify_(t_('signature_saved'));
}

function refreshHomepage_(message) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(onHomepage()))
    .setNotification(CardService.newNotification().setText(message))
    .build();
}
