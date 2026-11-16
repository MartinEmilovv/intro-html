// Run with: node --test test/history.test.js
// Loads History.gs (plain JavaScript) and tests the matching and pricing logic.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'History.gs'), 'utf8'), ctx);

const csv = fs.readFileSync(path.join(__dirname, '..', 'sample-history.csv'), 'utf8').trim();
const history = ctx.rowsToObjects_(csv.split('\n').map((line) => line.split(',')));

const request = {
  from_city: 'Sofia', from_country: 'BG', to_city: 'Duisburg', to_country: 'DE',
  truck_type: 'curtainsider',
};

test('only matches the same country pair', () => {
  const similar = ctx.findSimilar_(request, history);
  assert.strictEqual(similar.length, 5);
  for (const h of similar) {
    assert.strictEqual(h.from_country, 'BG');
    assert.strictEqual(h.to_country, 'DE');
  }
});

test('ranks same destination city first', () => {
  const similar = ctx.findSimilar_(request, history);
  // Sofia->Duisburg mega (to+from city = 5) beats Plovdiv->Duisburg curtainsider (to city + truck = 4)
  assert.deepStrictEqual(similar.slice(0, 2).map((h) => h.from_city + '>' + h.to_city),
    ['Sofia>Duisburg', 'Plovdiv>Duisburg']);
});

test('matches countries and cities regardless of case', () => {
  const lower = { ...request, from_country: 'bg', to_country: 'de', to_city: 'duisburg' };
  assert.strictEqual(ctx.findSimilar_(lower, history).length, 5);
});

test('suggests averages rounded to 10 EUR', () => {
  const s = ctx.suggestPrice_(ctx.findSimilar_(request, history));
  // sold: 2550,2600,2450,2500,2380 -> 2496 -> 2500; carrier: 2140,2150,2050,2120,2000 -> 2092 -> 2090
  assert.deepStrictEqual({ ...s }, { sell: 2500, carrier: 2090, margin: 410, basedOn: 5 });
});

test('no history on the country pair gives no suggestion', () => {
  const similar = ctx.findSimilar_({ ...request, to_country: 'FR' }, history);
  assert.strictEqual(similar.length, 0);
  assert.strictEqual(ctx.suggestPrice_(similar), null);
});

test('skips rows without prices and blank rows', () => {
  const rows = ctx.rowsToObjects_([
    ['date', 'from_city', 'from_country', 'to_city', 'to_country', 'truck_type', 'sold_eur', 'carrier_eur'],
    ['2026-01-01', 'Sofia', 'BG', 'Duisburg', 'DE', 'curtainsider', '', ''],
    ['', '', '', '', '', '', '', ''],
  ]);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(ctx.findSimilar_(request, rows).length, 0);
});
