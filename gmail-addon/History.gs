/**
 * Price history: reads past transports from a Google Sheet and finds ones
 * similar to a new request. Plain code, no AI, so the numbers are exact.
 *
 * Sheet layout (History tab, or the first tab; header row, any column order):
 *   date | from_city | from_country | to_city | to_country | truck_type | sold_eur | carrier_eur | carrier | delivery_date
 * `date` is the loading date; `delivery_date` is when the transport happened (shown in
 * the sidebar and used for "most recent first"; the loading date is used if it's empty).
 * The carrier column is optional and must match a name on the Carriers tab (Carriers.gs).
 * Cities in English, countries as 2-letter codes (BG, DE), truck_type one of
 * TRUCK_TYPES in Claude.gs.
 */

var MAX_SIMILAR = 5;

/** Reads all rows of the History tab as objects keyed by header name. */
function readHistory_(sheetId) {
  var values = historySheet_(SpreadsheetApp.openById(sheetId)).getDataRange().getValues();
  return rowsToObjects_(values);
}

function rowsToObjects_(values) {
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  return values.slice(1)
    .filter(function (row) { return row.join('') !== ''; })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

function norm_(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

/** When a past transport happened: its delivery date, or its loading date if none. */
function transportDate_(h) {
  return h.delivery_date !== undefined && String(h.delivery_date).trim() !== '' ? h.delivery_date : h.date;
}

function isDate_(d) {
  return Object.prototype.toString.call(d) === '[object Date]';
}

/** A date as DD.MM.YYYY (from a sheet Date or a "YYYY-MM-DD" text); other text as is. */
function formatDay_(d) {
  if (isDate_(d)) {
    return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
  }
  var m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '.' + m[2] + '.' + m[1] : String(d || '');
}

function toTime_(d) {
  if (isDate_(d)) return d.getTime();
  var t = Date.parse(String(d));
  return isNaN(t) ? 0 : t;
}

/**
 * Past transports on the same country pair, ranked by how closely they match:
 * same destination city (+3), same loading city (+2), same truck type (+1),
 * then most recent first. Returns {row, score, time} for each.
 */
function rankHistory_(request, history) {
  var fromC = norm_(request.from_country), toC = norm_(request.to_country);
  return history
    .filter(function (h) {
      return norm_(h.from_country) === fromC && norm_(h.to_country) === toC &&
        Number(h.sold_eur) > 0 && Number(h.carrier_eur) > 0;
    })
    .map(function (h) {
      var score = 0;
      if (norm_(h.to_city) === norm_(request.to_city)) score += 3;
      if (norm_(h.from_city) === norm_(request.from_city)) score += 2;
      if (norm_(h.truck_type) === norm_(request.truck_type)) score += 1;
      return { row: h, score: score, time: toTime_(transportDate_(h)) };
    })
    .sort(function (a, b) { return b.score - a.score || b.time - a.time; });
}

/** The closest past transports, for the price suggestion. */
function findSimilar_(request, history) {
  return rankHistory_(request, history)
    .slice(0, MAX_SIMILAR)
    .map(function (x) { return x.row; });
}

/** Average sold and carrier price of the similar transports, rounded to €10. */
function suggestPrice_(similar) {
  if (similar.length === 0) return null;
  var avg = function (key) {
    var sum = similar.reduce(function (s, h) { return s + Number(h[key]); }, 0);
    return Math.round(sum / similar.length / 10) * 10;
  };
  var sell = avg('sold_eur');
  var carrier = avg('carrier_eur');
  return { sell: sell, carrier: carrier, margin: sell - carrier, basedOn: similar.length };
}

/** The suggestion is per truck; for several trucks the whole order is n times that. */
function scaleSuggestion_(suggestion, truckCount) {
  var n = Number(truckCount);
  if (!suggestion || !(n > 1)) return suggestion;
  return {
    sell: suggestion.sell * n, carrier: suggestion.carrier * n, margin: suggestion.margin * n,
    basedOn: suggestion.basedOn, trucks: n
  };
}
