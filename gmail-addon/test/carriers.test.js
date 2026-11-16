// Run with: node --test test/carriers.test.js
// Tests which carriers are suggested and what goes into a carrier price request.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['Config.gs', 'History.gs', 'Carriers.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
}
const readCsv = (f) => ctx.rowsToObjects_(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
  .trim().split('\n').map((line) => line.split(',')));
const history = readCsv('sample-history.csv');
const carriers = readCsv('sample-carriers.csv');

const request = {
  from_city: 'Sofia', from_country: 'BG', from_address: 'кв. Враждебна',
  to_city: 'Duisburg', to_country: 'DE', to_address: '',
  loading_date: '2026-11-12', delivery_date: '2026-11-15',
  cargo: 'building materials', pallets: 33, weight_kg: 22000, truck_type: 'curtainsider',
  contact_name: 'Иван Петров', language: 'bg', is_transport_request: true, missing_info: [],
};

test('carriers are ranked by their best matching transport, each listed once', () => {
  const ranked = ctx.rankCarriers_(request, history, carriers);
  assert.deepStrictEqual([...ranked.map((c) => c.name)],
    ['Sample Haulage SRL', 'Демо Карго ООД', 'Пример Транс ЕООД', 'Тест Логистик ЕООД']);
  const primer = ranked.find((c) => c.name === 'Пример Транс ЕООД');
  assert.strictEqual(primer.runs, 2);
  assert.strictEqual(primer.best.to_city, 'Dortmund'); // most recent of its equal matches
});

test('contact details come from the Carriers tab, matched regardless of case', () => {
  const tab = carriers.map((c) => ({ ...c, carrier: c.carrier.toUpperCase() }));
  const sample = ctx.rankCarriers_(request, history, tab)[0];
  assert.strictEqual(sample.email, 'andrei@sample-haulage.example');
  assert.strictEqual(sample.contact, 'Andrei Popescu');
  assert.strictEqual(sample.language, 'en');
});

test('a carrier missing from the Carriers tab is still listed, without email', () => {
  const ranked = ctx.rankCarriers_(request, history, []);
  assert.strictEqual(ranked.length, 4);
  assert.ok(ranked.every((c) => c.email === '' && c.language === 'bg'));
});

test('other country pairs and rows without a carrier are ignored', () => {
  assert.strictEqual(ctx.rankCarriers_({ ...request, to_country: 'FR' }, history, carriers).length, 0);
  const noCarrier = history.map((h) => ({ ...h, carrier: '' }));
  assert.strictEqual(ctx.rankCarriers_(request, noCarrier, carriers).length, 0);
});

test('the load sent to Claude has no client, price or address details', () => {
  const load = ctx.carrierLoad_({ ...request, offer_price: 2500 });
  const text = JSON.stringify(load);
  for (const secret of ['Иван', 'Враждебна', '2500', 'contact_name', 'address', 'sold']) {
    assert.ok(!text.includes(secret), 'leaked: ' + secret);
  }
  assert.strictEqual(load.to_city, 'Duisburg');
  assert.strictEqual(load.weight_kg, 22000);
});

test('carrier email greets the contact by name and adds the signature', () => {
  assert.strictEqual(ctx.buildCarrierEmail_('bg', 'Георги Иванов', 'Имаме товар.\nПоздрави,', 'Мартин'),
    'Здравейте, Георги Иванов,\n\nИмаме товар.\nПоздрави,\nМартин');
  assert.ok(ctx.buildCarrierEmail_('en', '', 'We have a load.', '').startsWith('Hello,\n\n'));
});
