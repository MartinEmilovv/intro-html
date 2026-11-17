/**
 * Saved analyses: what Claude read from each request email, so reopening the email
 * shows the analysis again without a new Claude call.
 *
 * Kept in the user's cache (fast, 6 hours) and on a "Requests" tab of the company
 * sheet (permanent): date | request | route | data
 * `request` is the Gmail message ID; `data` is the analysis as JSON.
 */

var REQUESTS_TAB = 'Requests';
var REQUESTS_HEADER = ['date', 'request', 'route', 'data'];

/** Row index (0-based, header included) of a request in the tab's values; -1 if absent. */
function findRequestRow_(values, requestId) {
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][1]) === String(requestId)) return i;
  }
  return -1;
}

function saveAnalysis_(settings, requestId, request) {
  var json = JSON.stringify(request);
  CacheService.getUserCache().put('req:' + requestId, json, CACHE_SECONDS);
  if (!settings.historySheetId) return;
  var sheet = ensureTab_(SpreadsheetApp.openById(settings.historySheetId), REQUESTS_TAB, REQUESTS_HEADER);
  var row = findRequestRow_(sheet.getDataRange().getValues(), requestId);
  if (row === -1) {
    sheet.appendRow([new Date(), String(requestId), routeLabel_(request), json]);
  } else {
    sheet.getRange(row + 1, 1, 1, 4).setValues([[new Date(), String(requestId), routeLabel_(request), json]]);
  }
}

/** The saved analysis of this email, or null if it was never analyzed. */
function loadAnalysis_(settings, requestId) {
  var cache = CacheService.getUserCache();
  var cached = cache.get('req:' + requestId);
  if (cached) return JSON.parse(cached);
  if (!settings.historySheetId) return null;
  var sheet = SpreadsheetApp.openById(settings.historySheetId).getSheetByName(REQUESTS_TAB);
  if (!sheet) return null;
  var values = sheet.getDataRange().getValues();
  var row = findRequestRow_(values, requestId);
  if (row === -1) return null;
  cache.put('req:' + requestId, String(values[row][3]), CACHE_SECONDS);
  return JSON.parse(values[row][3]);
}
