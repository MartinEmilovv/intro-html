// Run with: node --test test/i18n.test.js
// Checks the sidebar texts exist in English and Bulgarian, with matching {parts}.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['Config.gs', 'Claude.gs', 'History.gs', 'Carriers.gs', 'Quotes.gs', 'Orders.gs',
  'Brand.gs', 'Requests.gs', 'Setup.gs', 'I18n.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
}
const parts = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');

test('every text exists in English and Bulgarian, with the same {parts}', () => {
  for (const [key, entry] of Object.entries(ctx.UI_TEXT)) {
    assert.ok(entry.en && entry.en.trim(), key + ': English missing');
    assert.ok(entry.bg && entry.bg.trim(), key + ': Bulgarian missing');
    assert.strictEqual(parts(entry.bg), parts(entry.en), key + ': {parts} differ');
  }
});

test('the Bulgarian texts are actually in Cyrillic (except names and codes)', () => {
  const allowedLatin = ['switch_language', 'source_Viber'];
  for (const [key, entry] of Object.entries(ctx.UI_TEXT)) {
    if (allowedLatin.includes(key)) continue;
    assert.ok(/[а-яА-Я]/.test(entry.bg), key + ': Bulgarian text has no Cyrillic');
  }
});

test('labels exist for every editable setting, quote source and truck type', () => {
  for (const [key] of ctx.EDITABLE_COMPANY_SETTINGS) assert.ok(ctx.UI_TEXT['set_' + key], 'set_' + key);
  for (const src of ctx.QUOTE_SOURCES) assert.ok(ctx.UI_TEXT['source_' + src], 'source_' + src);
  for (const lang of ctx.UI_LANGUAGES) {
    for (const type of ctx.TRUCK_TYPES) {
      assert.ok(ctx.TRUCK_LABELS_UI[lang][type], lang + ' truck label for ' + type);
    }
  }
});

test('texts are filled in, in the chosen language', () => {
  assert.strictEqual(ctx.t_('quote_saved', { carrier: 'Демо Карго', price: '€2,080' }, 'en'), 'Saved Демо Карго: €2,080.');
  assert.strictEqual(ctx.t_('quote_saved', { carrier: 'Демо Карго', price: '€2,080' }, 'bg'), 'Записано: Демо Карго, €2,080.');
  assert.strictEqual(ctx.t_('runs_many', { n: 3 }, 'bg'), '3 курса по този маршрут');
  assert.strictEqual(ctx.truckLabel_('curtainsider', 'bg'), 'Тент');
  assert.strictEqual(ctx.truckLabel_('curtainsider', 'en'), 'Curtainsider');
});

test('the language button names the other language', () => {
  assert.strictEqual(ctx.t_('switch_language', null, 'en'), 'Български');
  assert.strictEqual(ctx.t_('switch_language', null, 'bg'), 'English');
});

test('unknown keys and missing parts fail visibly, not silently', () => {
  assert.strictEqual(ctx.t_('no_such_key', null, 'en'), 'no_such_key');
  assert.strictEqual(ctx.fillText_('Order {number}', {}), 'Order {number}');
});
