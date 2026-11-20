/**
 * Sidebar language: every text the sidebar shows, in English and Bulgarian.
 *
 * Each person picks their own language with the button in the sidebar; the first
 * time it follows their Google account language. Documents and emails to clients
 * and carriers don't follow this: they use the client's or carrier's language.
 *
 * To change a wording, change it here. {name} parts are filled in by the code.
 */

var UI_LANGUAGES = ['en', 'bg'];

var UI_TEXT = {
  switch_language: { en: 'Български', bg: 'English' },
  language_switched: { en: 'Language: English', bg: 'Език: български' },

  // Home and setup
  home_intro: {
    en: 'Open a transport request email and click <b>Analyze request</b>.',
    bg: 'Отворете имейл със запитване за транспорт и натиснете <b>Анализирай запитването</b>.'
  },
  api_key_label: { en: 'Claude API key', bg: 'Claude API ключ' },
  api_key_missing: {
    en: 'Missing: add ANTHROPIC_API_KEY in Script Properties',
    bg: 'Липсва: добавете ANTHROPIC_API_KEY в Script Properties'
  },
  setup_header: { en: 'Set up your company', bg: 'Настройте фирмата си' },
  setup_intro: {
    en: 'The assistant keeps your price history, carriers, quotes and settings in a Google Sheet ' +
      'in <b>your own</b> Google Drive.',
    bg: 'Асистентът пази историята на цените, превозвачите, офертите и настройките ви в Google ' +
      'таблица във <b>вашия собствен</b> Google Drive.'
  },
  create_workspace: { en: 'Create company workspace', bg: 'Създай работно пространство' },
  or_join: {
    en: 'Or, if a colleague already set it up, paste the link of the company sheet they shared with you:',
    bg: 'Или, ако колега вече го е настроил, поставете връзката към фирмената таблица, която ви е споделил:'
  },
  sheet_link: { en: 'Company sheet link', bg: 'Връзка към фирмената таблица' },
  use_sheet: { en: 'Use this sheet', bg: 'Използвай тази таблица' },
  workspace_created: {
    en: 'Company workspace created in your Drive, in the "Freight Assistant" folder.',
    bg: 'Работното пространство е създадено във вашия Drive, в папка „Freight Assistant“.'
  },
  workspace_failed: {
    en: 'Could not create the workspace: {error}',
    bg: 'Работното пространство не можа да бъде създадено: {error}'
  },
  joined: { en: 'Connected to the company sheet.', bg: 'Свързано с фирмената таблица.' },
  paste_link: {
    en: 'Paste the link of the company\'s Google Sheet.',
    bg: 'Поставете връзката към Google таблицата на фирмата.'
  },
  cant_open_sheet: {
    en: 'Can\'t open that sheet. Ask the person who set it up to share it with you (Editor).',
    bg: 'Таблицата не може да бъде отворена. Помолете човека, който я е създал, да я сподели с вас ' +
      '(с права за редактиране).'
  },

  // Company settings and signature
  company_settings: { en: 'Company settings', bg: 'Настройки на фирмата' },
  company: { en: 'Company', bg: 'Фирма' },
  company_not_set: { en: 'Not set yet: fill in below', bg: 'Не е зададена: попълнете по-долу' },
  open_sheet: { en: 'Open company sheet', bg: 'Отвори фирмената таблица' },
  set_COMPANY_NAME: { en: 'Company name (on the transport orders)', bg: 'Име на фирмата (в заявките)' },
  set_ASSISTANT_NAME: { en: 'Assistant name, e.g. "Orbit Assistant"', bg: 'Име на асистента, напр. „Orbit Assistant“' },
  set_LOGO_URL: { en: 'Logo link (https, PNG or JPG)', bg: 'Връзка към логото (https, PNG или JPG)' },
  set_BRAND_COLOR: { en: 'Button color, e.g. #1d5b86', bg: 'Цвят на бутоните, напр. #1d5b86' },
  set_OFFER_TERMS: { en: 'Offer terms', bg: 'Условия в офертите' },
  set_CLIENT_PAYMENT_TERMS: { en: 'Payment terms for clients', bg: 'Условия за плащане за клиенти' },
  set_CARRIER_PAYMENT_TERMS: { en: 'Payment terms for carriers', bg: 'Условия за плащане за превозвачи' },
  set_CARGO_EXCLUSIONS: {
    en: 'If the cargo type is missing, add to offers',
    bg: 'Ако видът на товара липсва, добави към офертите'
  },
  set_WEIGHT_ASSUMPTION: {
    en: 'If the weight is missing, assume (e.g. up to 1,000 kg per pallet)',
    bg: 'Ако теглото липсва, приеми (напр. до 1 000 кг на палет)'
  },
  save_company: { en: 'Save company settings', bg: 'Запази настройките на фирмата' },
  company_note: {
    en: 'These apply to everyone at your company. To add colleagues, share the "Freight Assistant" ' +
      'folder with them; they paste the company sheet link in their sidebar.',
    bg: 'Важат за всички във фирмата ви. За да добавите колеги, споделете с тях папката ' +
      '„Freight Assistant“; те поставят връзката към фирмената таблица в своя страничен панел.'
  },
  company_saved: { en: 'Company settings saved.', bg: 'Настройките на фирмата са запазени.' },
  save_failed: { en: 'Could not save: {error}', bg: 'Неуспешно запазване: {error}' },
  logo_https: {
    en: 'The logo link must start with https:// and have no spaces.',
    bg: 'Връзката към логото трябва да започва с https:// и да е без интервали.'
  },
  color_hex: {
    en: 'Enter the color as a hex code, e.g. #1d5b86.',
    bg: 'Въведете цвета като шестнадесетичен код, напр. #1d5b86.'
  },
  name_too_long: {
    en: 'Keep the assistant name under 40 characters.',
    bg: 'Името на асистента трябва да е до 40 знака.'
  },
  signature_header: { en: 'Your signature', bg: 'Вашият подпис' },
  signature_title: { en: 'Added to your offers and emails', bg: 'Добавя се към офертите и имейлите ви' },
  save_signature: { en: 'Save signature', bg: 'Запази подписа' },
  signature_saved: { en: 'Signature saved.', bg: 'Подписът е запазен.' },

  // Request and analysis
  subtitle_requests: { en: 'Transport requests', bg: 'Запитвания за транспорт' },
  analyze: { en: 'Analyze request', bg: 'Анализирай запитването' },
  analyze_intro: {
    en: 'Read this email as a transport request and price it from your history.',
    bg: 'Прочита имейла като запитване за транспорт и предлага цена според историята ви.'
  },
  analyze_again: { en: 'Analyze again', bg: 'Анализирай отново' },
  analyze_first: { en: 'Click Analyze request first.', bg: 'Първо натиснете „Анализирай запитването“.' },
  not_request: {
    en: 'This email does not look like a transport request.',
    bg: 'Този имейл не изглежда като запитване за транспорт.'
  },
  sheet_read_error: {
    en: 'Could not read the price history sheet: {error}',
    bg: 'Таблицата с историята на цените не може да бъде прочетена: {error}'
  },
  subtitle_request: { en: 'Transport request · {route}', bg: 'Запитване · {route}' },
  read_from_email: { en: 'Read from the email', bg: 'Данни от имейла' },
  route: { en: 'Route', bg: 'Маршрут' },
  loading: { en: 'Loading', bg: 'Товарене' },
  delivery: { en: 'Delivery', bg: 'Доставка' },
  cargo: { en: 'Cargo', bg: 'Товар' },
  truck: { en: 'Truck', bg: 'Камион' },
  missing: { en: 'Missing', bg: 'Липсва' },
  pallets: { en: '{n} pallets', bg: '{n} палета' },
  similar_header: { en: 'Similar transports you have done', bg: 'Подобни превози, които сте правили' },
  no_sheet: { en: 'No price history sheet connected.', bg: 'Няма свързана таблица с история на цените.' },
  no_similar: {
    en: 'No past transports on this country pair yet.',
    bg: 'Все още няма превози между тези две държави.'
  },
  delivered: { en: 'delivered {date}', bg: 'доставен {date}' },
  similar_line: {
    en: 'Sold {sold} · Carrier {carrier} · Margin {margin}',
    bg: 'Продажба {sold} · Превозвач {carrier} · Марж {margin}'
  },
  your_offer: { en: 'Your offer', bg: 'Вашата оферта' },
  suggested: {
    en: 'Suggested: sell <b>{sell}</b>, expect carrier ~{carrier}, margin ~{margin} ' +
      '(average of {n} similar transports).',
    bg: 'Предложение: продажна цена <b>{sell}</b>, очаквана цена на превозвача ~{carrier}, ' +
      'марж ~{margin} (средно от {n} подобни превоза).'
  },
  offer_price: { en: 'Offer price, EUR excl. VAT', bg: 'Цена в офертата, EUR без ДДС' },
  create_reply: { en: 'Create reply draft', bg: 'Създай чернова на отговор' },
  price_number: {
    en: 'Enter the price as a number, e.g. {example}.',
    bg: 'Въведете цената като число, напр. {example}.'
  },

  // Carriers and quotes
  carriers_header: { en: 'Carriers for this route', bg: 'Превозвачи за този маршрут' },
  no_carriers: {
    en: 'No carriers on this country pair yet. Add a carrier column to your history and a ' +
      'Carriers tab with their contacts.',
    bg: 'Все още няма превозвачи между тези две държави. Добавете колона carrier в историята и ' +
      'раздел Carriers с контактите им.'
  },
  no_contact: { en: 'No contact details', bg: 'Няма данни за контакт' },
  runs_one: { en: '{n} run on this route', bg: '{n} курс по този маршрут' },
  runs_many: { en: '{n} runs on this route', bg: '{n} курса по този маршрут' },
  ask_price: { en: 'Ask for a price', bg: 'Поискай цена' },
  no_carrier_email: {
    en: 'None of these carriers has an email on the Carriers tab.',
    bg: 'Никой от тези превозвачи няма имейл в раздела Carriers.'
  },
  draft_requests: { en: 'Draft price requests', bg: 'Създай запитвания за цена' },
  tick_carrier: { en: 'Tick at least one carrier.', bg: 'Отметнете поне един превозвач.' },
  drafts_one: {
    en: 'Created 1 draft in your Drafts folder. Check it before sending.',
    bg: 'Създадена е 1 чернова в папка „Чернови“. Проверете я, преди да я изпратите.'
  },
  drafts_many: {
    en: 'Created {n} drafts in your Drafts folder. Check them before sending.',
    bg: 'Създадени са {n} чернови в папка „Чернови“. Проверете ги, преди да ги изпратите.'
  },
  quotes_header: { en: 'Carrier quotes', bg: 'Оферти от превозвачи' },
  no_quotes: {
    en: 'No quotes yet. Record prices carriers give you by email, Viber or phone.',
    bg: 'Все още няма оферти. Запишете цените, които превозвачите ви дават по имейл, Viber или телефон.'
  },
  cheapest: { en: '(cheapest)', bg: '(най-ниска)' },
  carrier: { en: 'Carrier', bg: 'Превозвач' },
  received_by: { en: 'Received by', bg: 'Получена чрез' },
  their_price: { en: 'Their price, EUR excl. VAT', bg: 'Тяхната цена, EUR без ДДС' },
  save_quote: { en: 'Save quote', bg: 'Запиши офертата' },
  choose_carrier: { en: 'Choose a carrier.', bg: 'Изберете превозвач.' },
  quote_saved: { en: 'Saved {carrier}: {price}.', bg: 'Записано: {carrier}, {price}.' },
  source_Email: { en: 'Email', bg: 'Имейл' },
  source_Viber: { en: 'Viber', bg: 'Viber' },
  source_Phone: { en: 'Phone', bg: 'Телефон' },

  // Order confirmed
  order_header: { en: 'Order confirmed', bg: 'Потвърдена поръчка' },
  order_intro: {
    en: 'When the client accepts and a carrier is confirmed: prepare both transport orders (заявки), ' +
      'the emails and the transport folder, and add the transport to your history.',
    bg: 'Когато клиентът приеме и превозвачът е потвърден: подгответе двете заявки, имейлите и ' +
      'папката на превоза, и добавете превоза към историята си.'
  },
  prepare_orders: { en: 'Prepare transport orders', bg: 'Подготви заявките' },
  connect_sheet_first: {
    en: 'Connect a price history sheet first.',
    bg: 'Първо свържете таблица с история на цените.'
  },
  subtitle_order: { en: 'Order confirmed · {route}', bg: 'Потвърдена поръчка · {route}' },
  order_check: {
    en: 'Check the details, then create the transport orders. Two drafts are created; nothing is sent.',
    bg: 'Проверете данните и създайте заявките. Създават се две чернови; нищо не се изпраща.'
  },
  client_company: { en: 'Client company (on the client\'s order)', bg: 'Фирма на клиента (в заявката към клиента)' },
  agreed_sell: { en: 'Agreed selling price, EUR excl. VAT', bg: 'Договорена продажна цена, EUR без ДДС' },
  carrier_price: { en: 'Carrier price, EUR excl. VAT', bg: 'Цена на превозвача, EUR без ДДС' },
  plates: { en: 'Truck / trailer plates (optional)', bg: 'Рег. номера на камион / ремарке (по желание)' },
  create_orders: { en: 'Create transport orders', bg: 'Създай заявките' },
  add_carriers_first: {
    en: 'Add your carriers to the Carriers tab of the price history sheet first.',
    bg: 'Първо добавете превозвачите си в раздела Carriers на таблицата.'
  },
  enter_client: { en: 'Enter the client company.', bg: 'Въведете фирмата на клиента.' },
  enter_sell: {
    en: 'Enter the agreed selling price as a number.',
    bg: 'Въведете договорената продажна цена като число.'
  },
  enter_carrier_price: {
    en: 'Enter the carrier price as a number.',
    bg: 'Въведете цената на превозвача като число.'
  },
  choose_carrier_list: { en: 'Choose a carrier from the list.', bg: 'Изберете превозвач от списъка.' },
  carrier_no_email: {
    en: '{carrier} has no email on the Carriers tab. Add it and try again.',
    bg: '{carrier} няма имейл в раздела Carriers. Добавете го и опитайте отново.'
  },
  orders_failed: {
    en: 'Could not create the transport orders: {error}',
    bg: 'Заявките не можаха да бъдат създадени: {error}'
  },
  orders_done: {
    en: '<b>Order {number}</b> is ready:<br>' +
      '• Reply to the client with their order ({sell}) in Drafts<br>' +
      '• Email to {carrier} with their order ({carrierPrice}) in Drafts<br>' +
      '• Transport folder in Drive<br>' +
      '• Added to your price history<br><br>' +
      'Check the drafts and PDFs before sending.',
    bg: '<b>Поръчка {number}</b> е готова:<br>' +
      '• Отговор до клиента с неговата заявка ({sell}) в „Чернови“<br>' +
      '• Имейл до {carrier} с неговата заявка ({carrierPrice}) в „Чернови“<br>' +
      '• Папка на превоза в Drive<br>' +
      '• Добавена към историята на цените<br><br>' +
      'Проверете черновите и PDF файловете, преди да ги изпратите.'
  },
  open_folder: { en: 'Open transport folder', bg: 'Отвори папката на превоза' },
  subtitle_done: { en: 'Order {number} · transport orders created', bg: 'Поръчка {number} · заявките са създадени' },
  template_access: {
    en: 'Can\'t open the company\'s order template. Ask the colleague who set up the assistant to ' +
      'share the "Freight Assistant" folder with you.',
    bg: 'Шаблонът за заявка на фирмата не може да бъде отворен. Помолете колегата, който е ' +
      'настроил асистента, да сподели с вас папката „Freight Assistant“.'
  },

  // Extra request details (also order form box labels)
  field_truck_count: { en: 'Number of trucks', bg: 'Брой камиони' },
  field_loading_time: { en: 'Loading time', bg: 'Час на товарене' },
  field_consignee: { en: 'Consignee (CMR)', bg: 'Получател по ЧМР' },
  field_customs_points: { en: 'Customs points', bg: 'Митници' },
  field_special_requirements: { en: 'Special requirements', bg: 'Допълнителни изисквания' },
  for_trucks: { en: 'Total for {n} trucks.', bg: 'Общо за {n} камиона.' },

  // Transport folder
  order_created: {
    en: 'Order <b>{number}</b> was created. When signed orders or new emails arrive, update the folder.',
    bg: 'Поръчка <b>{number}</b> е създадена. Когато пристигнат подписани заявки или нови имейли, ' +
      'обновете папката.'
  },
  update_folder: { en: 'Update transport folder', bg: 'Обнови папката на превоза' },
  update_folder_hint: {
    en: 'When the signed orders arrive, reopen this email and click Update transport folder.',
    bg: 'Когато пристигнат подписаните заявки, отворете отново този имейл и натиснете ' +
      '„Обнови папката на превоза“.'
  },
  folder_updated: {
    en: 'Transport folder updated: {n} email conversation(s) saved.',
    bg: 'Папката на превоза е обновена: запазени разговори: {n}.'
  },

  // Template converter
  templates_header: { en: 'Transport order templates', bg: 'Шаблони за заявки' },
  templates_intro: {
    en: 'Use your own заявки: put your Word or Google Docs template in Google Drive, paste its ' +
      'link and import it. The original file stays as it is.',
    bg: 'Използвайте вашите собствени заявки: качете шаблона си (Word или Google Docs) в Google ' +
      'Drive, поставете връзката и го импортирайте. Оригиналният файл не се променя.'
  },
  open_client_template: { en: 'Client template', bg: 'Шаблон за клиенти' },
  open_carrier_template: { en: 'Carrier template', bg: 'Шаблон за превозвачи' },
  template_link: { en: 'Link to the template in Google Drive', bg: 'Връзка към шаблона в Google Drive' },
  template_side: { en: 'Template for', bg: 'Шаблон за' },
  side_client: { en: 'Clients', bg: 'Клиенти' },
  side_carrier: { en: 'Carriers', bg: 'Превозвачи' },
  import_template: { en: 'Import template', bg: 'Импортирай шаблона' },
  bad_drive_link: {
    en: 'Paste the link of a file in your Google Drive.',
    bg: 'Поставете връзката към файл във вашия Google Drive.'
  },
  import_failed: { en: 'Could not import the template: {error}', bg: 'Шаблонът не можа да бъде импортиран: {error}' },
  import_done_client: {
    en: 'Your template is now used for client orders.',
    bg: 'Шаблонът ви вече се използва за заявките към клиенти.'
  },
  import_done_carrier: {
    en: 'Your template is now used for carrier orders.',
    bg: 'Шаблонът ви вече се използва за заявките към превозвачи.'
  },
  import_found: { en: 'Filled in automatically:', bg: 'Попълват се автоматично:' },
  import_missed: {
    en: 'Not placed (add these markers in the template by hand):',
    bg: 'Не са поставени (добавете тези маркери в шаблона ръчно):'
  },
  import_check: {
    en: 'Open the template and check the {{field}} markers once. You can edit it like any Google Doc.',
    bg: 'Отворете шаблона и проверете веднъж маркерите {{field}}. Можете да го редактирате като ' +
      'всеки Google Doc.'
  },
  open_template: { en: 'Open the template', bg: 'Отвори шаблона' },

  // Claude
  api_key_not_set: {
    en: 'ANTHROPIC_API_KEY is not set in Script Properties.',
    bg: 'ANTHROPIC_API_KEY не е зададен в Script Properties.'
  },
  claude_error: { en: 'Claude API error {status}: {message}', bg: 'Грешка от Claude API {status}: {message}' },
  claude_declined: { en: 'Claude declined this request.', bg: 'Claude отказа да обработи тази заявка.' },
  claude_cut_off: { en: 'Claude\'s answer was cut off. Try again.', bg: 'Отговорът на Claude беше прекъснат. Опитайте отново.' }
};

var TRUCK_LABELS_UI = {
  en: { curtainsider: 'Curtainsider', reefer: 'Reefer', mega: 'Mega', box: 'Box', flatbed: 'Flatbed',
    other: 'Other', unknown: 'Unknown' },
  bg: { curtainsider: 'Тент', reefer: 'Хладилен', mega: 'Мега', box: 'Фургон', flatbed: 'Платформа',
    other: 'Друг', unknown: 'Неизвестен' }
};

/** This person's sidebar language: their choice, else their Google account language. */
function uiLang_() {
  try {
    var chosen = PropertiesService.getUserProperties().getProperty('UI_LANG');
    if (UI_LANGUAGES.indexOf(chosen) !== -1) return chosen;
    return /^bg/i.test(Session.getActiveUserLocale()) ? 'bg' : 'en';
  } catch (err) {
    return 'en';
  }
}

/** Fills {name} parts of a text; pure, so it can be tested. */
function fillText_(text, params) {
  return String(text).replace(/\{(\w+)\}/g, function (all, name) {
    return params && params[name] != null ? String(params[name]) : all;
  });
}

/** The sidebar text for `key` in this person's language (English if missing). */
function t_(key, params, lang) {
  var entry = UI_TEXT[key];
  if (!entry) return key;
  var l = lang || uiLang_();
  return fillText_(entry[l] || entry.en, params);
}

function truckLabel_(type, lang) {
  var labels = TRUCK_LABELS_UI[lang || uiLang_()] || TRUCK_LABELS_UI.en;
  return labels[type] || type || '';
}

function languageButton_() {
  return CardService.newTextButton()
    .setText(t_('switch_language'))
    .setOnClickAction(CardService.newAction().setFunctionName('onSwitchLanguage'));
}

/** Switches English <-> Bulgarian and redraws the card the person is looking at. */
function onSwitchLanguage(e) {
  var next = uiLang_() === 'bg' ? 'en' : 'bg';
  PropertiesService.getUserProperties().setProperty('UI_LANG', next);
  var card;
  if (e.gmail && e.gmail.messageId) {
    var settings = getSettings_();
    var saved = loadAnalysis_(settings, e.gmail.messageId);
    card = saved ? renderAnalysis_(e.gmail.messageId, saved, settings) : onGmailMessage(e);
  } else {
    card = onHomepage();
  }
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .setNotification(CardService.newNotification().setText(t_('language_switched', null, next)))
    .build();
}
