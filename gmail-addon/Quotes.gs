/**
 * Carrier quotes: prices carriers gave for a request, by email, Viber or phone.
 * Saved on a "Quotes" tab of the price history sheet (created on first use),
 * listed in the sidebar, and used to pre-fill the order form.
 *
 * Quotes tab: date | request | route | carrier | price_eur | source | loading_date | delivery_date
 * `request` is the Gmail message ID of the transport request.
 */

var QUOTES_TAB = 'Quotes';
var QUOTES_HEADER = ['date', 'request', 'route', 'carrier', 'price_eur', 'source', 'loading_date', 'delivery_date'];
var QUOTE_SOURCES = ['Email', 'Viber', 'Phone'];

function getQuotesSheet_(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(QUOTES_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(QUOTES_TAB);
    sheet.appendRow(QUOTES_HEADER);
  }
  return sheet;
}

/** Quotes saved for one request, cheapest first. */
function readQuotes_(sheetId, requestId) {
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName(QUOTES_TAB);
  if (!sheet) return [];
  return quotesForRequest_(rowsToObjects_(sheet.getDataRange().getValues()), requestId);
}

function quotesForRequest_(rows, requestId) {
  return rows
    .filter(function (q) { return String(q.request) === String(requestId) && Number(q.price_eur) > 0; })
    .sort(function (a, b) { return Number(a.price_eur) - Number(b.price_eur); });
}

function saveQuote_(sheetId, requestId, request, carrier, priceEur, source, dates) {
  appendByHeader_(getQuotesSheet_(sheetId), QUOTES_HEADER, {
    date: new Date(), request: String(requestId), route: routeLabel_(request), carrier: carrier,
    price_eur: priceEur, source: source,
    loading_date: dates && dates.loading_date || '', delivery_date: dates && dates.delivery_date || ''
  });
}

/** Header cells to add so a tab has every column, keeping existing columns where they are. */
function missingColumns_(header, wanted) {
  var have = header.map(function (h) { return String(h).trim().toLowerCase(); });
  return wanted.filter(function (w) { return have.indexOf(w) === -1; });
}

/** Appends a row by column name; adds any missing columns at the end first. */
function appendByHeader_(sheet, wanted, values) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var missing = missingColumns_(header, wanted);
  if (missing.length) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    header = header.concat(missing);
  }
  sheet.appendRow(header.map(function (h) {
    var v = values[String(h).trim().toLowerCase()];
    return v == null ? '' : v;
  }));
}

/** "Sofia → Duisburg" */
function routeLabel_(r) {
  return (r.from_city || r.from_country || '?') + ' → ' + (r.to_city || r.to_country || '?');
}

/** Parses "2 080", "2080,50" or "2.080" into a number of euros; null if it isn't one. */
function parsePrice_(text) {
  var t = String(text || '').replace(/[\s€]|EUR/gi, '');
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  t = t.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  var n = Number(t);
  return n > 0 ? n : null;
}
