/**
 * Test mode: run the whole flow (price requests, carrier replies, заявки) on your
 * own Gmail, without emailing any real carrier.
 *
 * It's personal: turn it on by running enableTestMode in the Apps Script editor
 * (off: disableTestMode). It affects only the account that ran it; clients and
 * colleagues never see it.
 *
 * While it's on:
 * - every email to a carrier goes to your own address with a tag, e.g.
 *   you+primer-trans@gmail.com (Gmail delivers it to your inbox);
 * - new drafts get "[TEST]" in the subject;
 * - "Simulate carrier replies" makes each carrier answer your sent price request,
 *   in the same conversation, with a price and dates (marked as simulated).
 */

var TEST_SUBJECT_PREFIX = '[TEST] ';
var TRANSIT_DAYS = { DE: 3, NL: 3, BE: 3, FR: 4, IT: 2, AT: 2, RO: 1, GR: 2, TR: 3, PL: 3, CZ: 2, HU: 1 };

function enableTestMode() {
  PropertiesService.getUserProperties().setProperty('TEST_MODE', 'on');
  console.log('Test mode is on for ' + Session.getEffectiveUser().getEmail() +
    '. Carrier emails go to your own address. Run disableTestMode to turn it off.');
}

function disableTestMode() {
  PropertiesService.getUserProperties().deleteProperty('TEST_MODE');
  console.log('Test mode is off.');
}

function isTestMode_() {
  try {
    return PropertiesService.getUserProperties().getProperty('TEST_MODE') === 'on';
  } catch (err) {
    return false;
  }
}

// ---- Pure helpers (tested in test/testmode.test.js) ------------------------------

/** "georgi@primer-trans.example" -> "primer-trans": a short tag naming the carrier. */
function carrierSlug_(email) {
  var domain = String(email).split('@')[1] || String(email);
  var name = domain.split('.')[0] || domain;
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) || 'carrier';
}

/** "me@gmail.com" + "primer-trans" -> "me+primer-trans@gmail.com". */
function plusAddress_(me, tag) {
  var parts = String(me).split('@');
  return parts[0].split('+')[0] + '+' + tag + '@' + parts[1];
}

/** Made-up addresses that can never be delivered (sample data): .example, .test, .invalid. */
function isPlaceholderAddress_(email) {
  return /\.(example|test|invalid)$/i.test(String(email).trim());
}

/**
 * Where a carrier email really goes: your own tagged address in test mode, and
 * always for made-up sample addresses (they could never be delivered anyway).
 */
function testRecipient_(email, me, testMode) {
  return testMode || isPlaceholderAddress_(email) ? plusAddress_(me, carrierSlug_(email)) : email;
}

function testSubject_(subject, testMode) {
  return testMode && String(subject).indexOf(TEST_SUBJECT_PREFIX) !== 0 ? TEST_SUBJECT_PREFIX + subject : subject;
}

function addDays_(isoDate, days) {
  var m = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

/**
 * A believable carrier answer: the carrier's own past price on this country pair
 * (or a typical one), changed by up to +-6%, rounded to 10 EUR, times the trucks.
 * `rand` is a number 0..1 so tests can fix it.
 */
function simulatedQuote_(request, carrier, pastCarrierPrice, rand, today) {
  var base = Number(pastCarrierPrice) > 0 ? Number(pastCarrierPrice) : 2000;
  var perTruck = Math.round(base * (0.94 + 0.12 * rand) / 10) * 10;
  var trucks = Number(request.truck_count) > 1 ? Number(request.truck_count) : 1;
  var loading = /^\d{4}-\d{2}-\d{2}$/.test(request.loading_date || '')
    ? request.loading_date : addDays_(isoDay_(today), 2);
  var transit = TRANSIT_DAYS[String(request.to_country || '').toUpperCase()] || 3;
  var delivery = /^\d{4}-\d{2}-\d{2}$/.test(request.delivery_date || '')
    ? request.delivery_date : addDays_(loading, transit);
  return { price: perTruck * trucks, loading_date: loading, delivery_date: delivery };
}

function isoDay_(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

function simulatedReplyBody_(quote, request, carrier) {
  var route = routeLabel_(request);
  var price = String(quote.price).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if ((carrier.language || 'bg') === 'bg') {
    return 'Здравейте,\n\nБлагодарим за запитването. Можем да изпълним курса ' + route + ' за ' + price +
      ' EUR без ДДС.\nТоварене: ' + formatDay_(quote.loading_date) + '\nДоставка: ' + formatDay_(quote.delivery_date) +
      '\n\nПоздрави,\n' + (carrier.contact || '') + '\n' + carrier.name +
      '\n\n(Симулиран отговор, тестов режим)';
  }
  return 'Hello,\n\nThank you for your inquiry. We can do ' + route + ' for ' + price +
    ' EUR excl. VAT.\nLoading: ' + formatDay_(quote.loading_date) + '\nDelivery: ' + formatDay_(quote.delivery_date) +
    '\n\nBest regards,\n' + (carrier.contact || '') + '\n' + carrier.name + '\n\n(Simulated reply, test mode)';
}

/** "=?UTF-8?B?...?=" for header text that isn't plain ASCII. `b64` encodes a UTF-8 string. */
function encodeHeaderWord_(text, b64) {
  return /^[\x20-\x7e]*$/.test(text) ? text : '=?UTF-8?B?' + b64(text) + '?=';
}

/** A complete reply email (MIME), to insert into the price request's conversation. */
function buildReplyMime_(m, b64) {
  return [
    'From: ' + encodeHeaderWord_(m.fromName, b64) + ' <' + m.fromEmail + '>',
    'To: ' + m.to,
    'Subject: ' + encodeHeaderWord_(m.subject, b64),
    'Date: ' + m.date,
    'Message-ID: <' + m.messageId + '>',
    'In-Reply-To: ' + m.inReplyTo,
    'References: ' + m.inReplyTo,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    (b64(m.body).match(/.{1,76}/g) || ['']).join('\r\n')
  ].join('\r\n');
}

// ---- Simulating replies --------------------------------------------------------------

function utf8Base64_(text) {
  return Utilities.base64Encode(Utilities.newBlob(text).getBytes());
}

/**
 * For each price request you sent for this request in test mode and that has no
 * reply yet, inserts the carrier's simulated reply into the same conversation.
 * Returns {replied, waiting}: waiting = drafts not sent yet.
 */
function simulateCarrierReplies_(requestId, request, settings) {
  var me = Session.getEffectiveUser().getEmail();
  var sent = readPriceRequests_(settings.historySheetId)
    .filter(function (p) { return String(p.request) === String(requestId); });
  var history = readHistory_(settings.historySheetId);
  var ranked = rankCarriers_(request, history, readCarriers_(settings.historySheetId));
  var replied = 0, waiting = 0;
  sent.forEach(function (p) {
    var thread = GmailApp.search('in:sent to:' + p.recipient + ' newer_than:14d').filter(function (t) {
      return normalizeSubject_(t.getFirstMessageSubject()) === normalizeSubject_(p.subject);
    })[0];
    if (!thread) { waiting += 1; return; }
    var messages = thread.getMessages();
    var last = messages[messages.length - 1];
    if (parseSender_(last.getFrom()).email.toLowerCase() !== me.toLowerCase()) return; // already answered
    var carrier = ranked.filter(function (c) { return norm_(c.name) === norm_(p.carrier); })[0] ||
      { name: p.carrier, contact: '', language: 'bg', best: {} };
    var quote = simulatedQuote_(request, carrier, carrier.best.carrier_eur, Math.random(), new Date());
    var mime = buildReplyMime_({
      fromName: carrier.contact ? carrier.contact + ', ' + carrier.name : carrier.name,
      fromEmail: p.recipient, to: me,
      subject: 'Re: ' + thread.getFirstMessageSubject(),
      date: new Date().toUTCString(),
      messageId: Utilities.getUuid() + '@freight-assistant.test',
      inReplyTo: last.getHeader('Message-ID'),
      body: simulatedReplyBody_(quote, request, carrier)
    }, utf8Base64_);
    Gmail.Users.Messages.insert({
      raw: Utilities.base64EncodeWebSafe(Utilities.newBlob(mime).getBytes()),
      threadId: thread.getId(),
      labelIds: ['INBOX', 'UNREAD']
    }, 'me');
    replied += 1;
  });
  return { replied: replied, waiting: waiting };
}

/** From the request's card, or from a sent price request (parameter `request`). */
function onSimulateReplies(e) {
  requireAuthorization_();
  if (!isTestMode_()) return notify_(t_('test_mode_off'));
  var params = e.commonEventObject.parameters || {};
  var requestId = params.request || e.gmail.messageId;
  var settings = getSettings_();
  var result;
  try {
    var request = loadAnalysis_(settings, requestId);
    if (!request) return notify_(t_('analyze_first'));
    result = simulateCarrierReplies_(requestId, request, settings);
  } catch (err) {
    return notify_(err.message);
  }
  if (result.replied === 0) return notify_(t_(result.waiting ? 'simulate_send_first' : 'simulate_none'));
  return notify_(t_('simulate_done', { n: result.replied }));
}
