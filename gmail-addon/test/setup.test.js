// Run with: node --test test/setup.test.js
// Tests the company workspace helpers: sheet links, the Settings tab and the
// per-company order counter.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['Config.gs', 'History.gs', 'Carriers.gs', 'Quotes.gs', 'Orders.gs', 'Brand.gs', 'Requests.gs', 'Setup.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const ID = '15bU9Qq22EsF6yxXxQ6vB9nP7dGmANWpKtgOigZt1R1g';

test('sheet ID from a link, or the ID itself', () => {
  assert.strictEqual(ctx.parseSheetId_('https://docs.google.com/spreadsheets/d/' + ID + '/edit?usp=sharing'), ID);
  assert.strictEqual(ctx.parseSheetId_('  ' + ID + ' '), ID);
  assert.strictEqual(ctx.parseSheetId_('https://drive.google.com/drive/folders/abc'), null);
  assert.strictEqual(ctx.parseSheetId_(''), null);
  assert.strictEqual(ctx.parseSheetId_('not a link'), null);
});

test('Settings tab rows become a map of values, skipping blanks', () => {
  const rows = [
    ['setting', 'value', 'what it is'],
    ['COMPANY_NAME', '  Спедиция Пример ООД ', ''],
    ['NEXT_ORDER_NUMBER', 7, ''],
    ['', 'ignored', ''],
    ['OFFER_TERMS', null, ''],
  ];
  assert.deepStrictEqual(plain(ctx.settingsFromRows_(rows)),
    { COMPANY_NAME: 'Спедиция Пример ООД', NEXT_ORDER_NUMBER: '7', OFFER_TERMS: '' });
});

test('order counter: continues within a year, restarts in a new year, starts at 1', () => {
  assert.deepStrictEqual(plain(ctx.nextOrderState_('7', '2026', 2026)), { number: '2026-0007', next: 8, year: 2026 });
  assert.deepStrictEqual(plain(ctx.nextOrderState_('42', '2026', 2027)), { number: '2027-0001', next: 2, year: 2027 });
  assert.deepStrictEqual(plain(ctx.nextOrderState_('', '', 2026)), { number: '2026-0001', next: 2, year: 2026 });
});

test('two companies keep their own counters', () => {
  // Each company's counter is read from and written to its own Settings tab.
  const a = ctx.nextOrderState_('12', '2026', 2026);
  const b = ctx.nextOrderState_('', '', 2026);
  assert.strictEqual(a.number, '2026-0012');
  assert.strictEqual(b.number, '2026-0001');
});

test('every company setting has a default and a description', () => {
  const defs = plain(ctx.companySettingDefs_());
  const keys = defs.map((d) => d[0]);
  for (const key of ['COMPANY_NAME', 'OFFER_TERMS', 'CLIENT_PAYMENT_TERMS', 'CARRIER_PAYMENT_TERMS',
    'CLIENT_TEMPLATE_ID', 'CARRIER_TEMPLATE_ID', 'NEXT_ORDER_NUMBER', 'ORDER_NUMBER_YEAR']) {
    assert.ok(keys.includes(key), 'missing ' + key);
  }
  assert.ok(defs.every((d) => typeof d[1] === 'string' && d[2].length > 0));
});

test('no company data is kept in the shared Config', () => {
  assert.strictEqual(ctx.CONFIG.HISTORY_SHEET_ID, undefined);
  assert.strictEqual(ctx.CONFIG.SIGNATURE, undefined);
  assert.strictEqual(ctx.CONFIG.COMPANY_NAME, undefined);
});

test('saved analyses are found by email ID', () => {
  const values = [
    ['date', 'request', 'route', 'data'],
    ['2026-11-16', '1a1e59d5712e8a68', 'Sofia → Duisburg', '{}'],
    ['2026-11-17', '1a1e59d5712e9999', 'Ruse → Bucharest', '{}'],
  ];
  assert.strictEqual(ctx.findRequestRow_(values, '1a1e59d5712e9999'), 2);
  assert.strictEqual(ctx.findRequestRow_(values, 'unknown'), -1);
  assert.strictEqual(ctx.findRequestRow_(values, 'request'), -1); // never matches the header
});

test('company settings from the sidebar: valid values are cleaned up', () => {
  const r = plain(ctx.validateCompanySettings_({
    COMPANY_NAME: ' Orbit Bulgaria ', ASSISTANT_NAME: 'Orbit Assistant',
    LOGO_URL: 'https://example.com/logo.png', BRAND_COLOR: 'E30613',
    OFFER_TERMS: 'Цена без ДДС.', CLIENT_PAYMENT_TERMS: '30 дни', CARRIER_PAYMENT_TERMS: '45 дни',
  }));
  assert.strictEqual(r.error, undefined);
  assert.strictEqual(r.values.COMPANY_NAME, 'Orbit Bulgaria');
  assert.strictEqual(r.values.BRAND_COLOR, '#e30613');
  assert.strictEqual(r.values.LOGO_URL, 'https://example.com/logo.png');
});

test('company settings from the sidebar: empty logo and color are allowed', () => {
  const r = plain(ctx.validateCompanySettings_({ COMPANY_NAME: 'X' }));
  assert.strictEqual(r.error, undefined);
  assert.strictEqual(r.values.LOGO_URL, '');
  assert.strictEqual(r.values.BRAND_COLOR, '');
  assert.strictEqual(r.values.OFFER_TERMS, '');
});

test('company settings from the sidebar: mistakes are explained', () => {
  assert.match(ctx.validateCompanySettings_({ LOGO_URL: 'www.orbit.bg/logo.png' }).error, /https/);
  assert.match(ctx.validateCompanySettings_({ BRAND_COLOR: 'red' }).error, /hex code/);
  assert.match(ctx.validateCompanySettings_({ ASSISTANT_NAME: 'x'.repeat(41) }).error, /40/);
  assert.strictEqual(ctx.validateCompanySettings_({ BRAND_COLOR: '#1d5b86' }).error, undefined);
});
