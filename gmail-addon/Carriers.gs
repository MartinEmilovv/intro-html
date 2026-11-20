/**
 * Carriers: finds carriers you've used on similar routes and drafts price
 * requests to them.
 *
 * Carriers tab (a tab named "Carriers" in the price history sheet, header row):
 *   carrier | contact_person | email | phone | language
 * `carrier` must match the carrier column on the history tab. `language` is bg or
 * en (empty = bg) and sets the language of the price request.
 *
 * The request is written only from the load details (route, dates, cargo, truck).
 * Your selling price, your client's name and their exact addresses are never
 * passed to Claude for it, so they cannot appear in a carrier email.
 */

var CARRIERS_TAB = 'Carriers';
var MAX_CARRIERS = 6;
var PRESELECT_CARRIERS = 3;

var CARRIER_REQUEST_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' }
  },
  required: ['subject', 'body'],
  additionalProperties: false
};

var CARRIER_REQUEST_SYSTEM =
  'You write price requests from a road freight forwarding company in Bulgaria to a carrier. ' +
  'Write in the language given. Be brief and businesslike, as an experienced forwarder would. ' +
  'List the loading place, date and time, unloading place and delivery date, cargo, pallets, ' +
  'weight, truck type and number of trucks, customs points and special requirements, then ask ' +
  'for their price and whether they have a truck available. ' +
  'Leave out any detail that is not given; never invent details. ' +
  'The subject is short: the route and the loading date. ' +
  'The body starts right after the greeting line (do not write a greeting or a name) and ends ' +
  'with a closing line such as "Поздрави," or "Best regards," with no name or signature. ' +
  'Plain text only, no markdown.';

/** Reads the Carriers tab; an empty list if there is none. */
function readCarriers_(sheetId) {
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName(CARRIERS_TAB);
  return sheet ? rowsToObjects_(sheet.getDataRange().getValues()) : [];
}

/**
 * Carriers who ran transports on this country pair, best match first (same
 * ranking as the price suggestion), with their contact details.
 */
function rankCarriers_(request, history, carriers) {
  var contacts = {};
  carriers.forEach(function (c) { contacts[norm_(c.carrier)] = c; });

  var groups = {};
  var order = [];
  rankHistory_(request, history).forEach(function (x) {
    var key = norm_(x.row.carrier);
    if (!key) return;
    if (!groups[key]) {
      groups[key] = { name: String(x.row.carrier).trim(), best: x.row, runs: 0 };
      order.push(key);
    }
    groups[key].runs += 1;
  });

  return order.slice(0, MAX_CARRIERS).map(function (key) {
    var g = groups[key];
    var c = contacts[key] || {};
    return {
      key: key,
      name: g.name,
      contact: String(c.contact_person || '').trim(),
      email: String(c.email || '').trim(),
      phone: String(c.phone || '').trim(),
      language: norm_(c.language) || 'bg',
      best: g.best,
      runs: g.runs
    };
  });
}

/**
 * Only the load details a carrier needs to quote. Nothing about the client, the
 * consignee (the client's customer) or our price.
 */
function carrierLoad_(request) {
  return {
    from_city: request.from_city,
    from_country: request.from_country,
    to_city: request.to_city,
    to_country: request.to_country,
    loading_date: request.loading_date,
    delivery_date: request.delivery_date,
    cargo: request.cargo,
    pallets: request.pallets,
    weight_kg: request.weight_kg,
    truck_type: request.truck_type,
    truck_count: request.truck_count,
    loading_time: request.loading_time,
    customs_points: request.customs_points,
    special_requirements: request.special_requirements
  };
}

/** One Claude call per language: {subject, body} without greeting or signature. */
function draftCarrierRequest_(request, language) {
  var text = 'Language: ' + language + '\n\nLoad details:\n' +
    JSON.stringify(carrierLoad_(request), null, 2);
  return JSON.parse(callClaude_(CARRIER_REQUEST_SYSTEM, text, 'low', CARRIER_REQUEST_SCHEMA));
}

/** Greeting (by contact name when known) + Claude's body + optional signature. */
function buildCarrierEmail_(language, contact, body, signature) {
  var t = CONFIG.ACK_TEMPLATES[language] || CONFIG.ACK_TEMPLATES.en;
  var greeting = contact ? t.greetingWithName.replace('{name}', contact) : t.greeting;
  var lines = [greeting, '', String(body).trim()];
  if (signature) lines.push(signature);
  return lines.join('\n');
}
