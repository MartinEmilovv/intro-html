// Run with: node --test test/orders.test.js
// Tests the заявки data (which price and party goes on which document), order
// numbers, history rows, quotes and the order emails.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['Config.gs', 'Main.gs', 'History.gs', 'Quotes.gs', 'Orders.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
}
const plain = (x) => JSON.parse(JSON.stringify(x));

const settings = {
  companyName: 'Спедиция Пример ООД', clientPaymentTerms: '30 дни', carrierPaymentTerms: '45 дни след CMR',
};
const order = {
  number: '2026-0007', date: '17.11.2026', language: 'bg',
  client_name: 'Стройматериали Юг ООД', client_contact: 'Иван Петров', client_email: 'ivan@client.example',
  sell_eur: 2500, carrier_name: 'Пример Транс ЕООД', carrier_contact: 'Георги Иванов',
  carrier_email: 'georgi@primer-trans.example', carrier_language: 'bg', carrier_eur: 2080,
  plates: 'CB 4512 KM / CB 7731 EE',
  from_city: 'Sofia', from_country: 'BG', from_address: 'кв. Враждебна',
  to_city: 'Duisburg', to_country: 'DE', to_address: '',
  loading_date: '2026-11-12', delivery_date: '2026-11-15',
  cargo: 'building materials', pallets: 33, weight_kg: 22000, truck_type: 'curtainsider',
};

test('client заявка has the selling price and the client, never the carrier', () => {
  const f = plain(ctx.buildOrderFields_(order, 'client', settings));
  assert.strictEqual(f.price, '2 500 EUR');
  assert.strictEqual(f.client, 'Стройматериали Юг ООД');
  assert.strictEqual(f.payment_terms, '30 дни');
  const text = JSON.stringify(f);
  for (const secret of ['2080', '2 080', 'Пример Транс', 'Георги', 'georgi@', '45 дни']) {
    assert.ok(!text.includes(secret), 'client document leaked: ' + secret);
  }
});

test('carrier заявка has the carrier price and the carrier, never the client or selling price', () => {
  const f = plain(ctx.buildOrderFields_(order, 'carrier', settings));
  assert.strictEqual(f.price, '2 080 EUR');
  assert.strictEqual(f.carrier, 'Пример Транс ЕООД');
  assert.strictEqual(f.carrier_contact, 'Георги Иванов');
  const text = JSON.stringify(f);
  for (const secret of ['2500', '2 500', 'Стройматериали', 'Иван Петров', 'ivan@', '30 дни']) {
    assert.ok(!text.includes(secret), 'carrier document leaked: ' + secret);
  }
});

test('shared load details are on both documents', () => {
  for (const side of ['client', 'carrier']) {
    const f = plain(ctx.buildOrderFields_(order, side, settings));
    assert.strictEqual(f.loading_place, 'кв. Враждебна, Sofia, BG');
    assert.strictEqual(f.unloading_place, 'Duisburg, DE');
    assert.strictEqual(f.truck_type, 'Тент 13,6 м');
    assert.strictEqual(f.weight, '22000 кг');
    assert.strictEqual(f.truck_plates, 'CB 4512 KM / CB 7731 EE');
    assert.strictEqual(f.company, 'Спедиция Пример ООД');
  }
});

test('order numbers are year plus a 4-digit running number', () => {
  assert.strictEqual(ctx.formatOrderNumber_(2026, 1), '2026-0001');
  assert.strictEqual(ctx.formatOrderNumber_(2026, 123), '2026-0123');
});

test('history row follows the tab columns and leaves unknown columns empty', () => {
  const headers = ['date', 'from_city', 'from_country', 'to_city', 'to_country', 'truck_type',
    'sold_eur', 'carrier_eur', 'carrier', 'Notes'];
  assert.deepStrictEqual(plain(ctx.historyRowFor_(headers, order)),
    ['2026-11-12', 'Sofia', 'BG', 'Duisburg', 'DE', 'curtainsider', 2500, 2080, 'Пример Транс ЕООД', '']);
});

test('client email asks for their signed заявка; carrier email names the order', () => {
  const client = ctx.buildClientOrderEmail_(order, 'Мартин');
  assert.ok(client.startsWith('Здравейте, Иван Петров,'));
  assert.ok(client.includes('официална заявка'));
  assert.ok(client.endsWith('Поздрави,\nМартин'));
  assert.ok(!client.includes('2080') && !client.includes('Пример Транс'));

  const carrier = ctx.buildCarrierOrderEmail_(order, '');
  assert.strictEqual(carrier.subject, 'Заявка № 2026-0007: Sofia → Duisburg, 2026-11-12');
  assert.ok(carrier.body.startsWith('Здравейте, Георги Иванов,'));
  assert.ok(carrier.body.includes('№ 2026-0007'));
  assert.ok(!carrier.body.includes('2500') && !carrier.body.includes('Стройматериали'));
});

test('English carrier gets the English email', () => {
  const carrier = ctx.buildCarrierOrderEmail_({ ...order, carrier_language: 'en', carrier_contact: 'Andrei' }, '');
  assert.ok(carrier.subject.startsWith('Transport order no. 2026-0007'));
  assert.ok(carrier.body.startsWith('Hello Andrei,'));
});

test('folder name and summary', () => {
  assert.strictEqual(ctx.orderFolderName_(order), '2026-0007 Sofia–Duisburg');
  const summary = ctx.orderSummaryText_(order);
  assert.ok(summary.includes('Selling price: 2 500 EUR'));
  assert.ok(summary.includes('Carrier price: 2 080 EUR'));
  assert.ok(summary.includes('Margin: 420 EUR'));
});

test('prices typed in different ways are understood', () => {
  assert.strictEqual(ctx.parsePrice_('2080'), 2080);
  assert.strictEqual(ctx.parsePrice_('2 080'), 2080);
  assert.strictEqual(ctx.parsePrice_('2.080'), 2080);
  assert.strictEqual(ctx.parsePrice_('2080,50'), 2080.5);
  assert.strictEqual(ctx.parsePrice_('€2 080 EUR'), 2080);
  assert.strictEqual(ctx.parsePrice_('abc'), null);
  assert.strictEqual(ctx.parsePrice_('0'), null);
  assert.strictEqual(ctx.parsePrice_(''), null);
});

test('quotes for a request, cheapest first', () => {
  const rows = [
    { request: 'm1', carrier: 'A', price_eur: 2150, source: 'Viber' },
    { request: 'm2', carrier: 'B', price_eur: 1000, source: 'Email' },
    { request: 'm1', carrier: 'C', price_eur: 2080, source: 'Phone' },
    { request: 'm1', carrier: 'D', price_eur: '', source: 'Email' },
  ];
  assert.deepStrictEqual(plain(ctx.quotesForRequest_(rows, 'm1')).map((q) => q.carrier), ['C', 'A']);
});

test('carrier choices: route carriers first, then the rest, each once', () => {
  const ranked = [{ name: 'Sample Haulage SRL' }, { name: 'Демо Карго ООД' }];
  const tab = [{ carrier: 'Пример Транс ЕООД' }, { carrier: 'sample haulage srl' }, { carrier: '' }];
  assert.deepStrictEqual(plain(ctx.carrierChoices_(ranked, tab)),
    ['Sample Haulage SRL', 'Демо Карго ООД', 'Пример Транс ЕООД']);
});

test('sender is split into name and email', () => {
  assert.deepStrictEqual(plain(ctx.parseSender_('Иван Петров <ivan@x.bg>')), { name: 'Иван Петров', email: 'ivan@x.bg' });
  assert.deepStrictEqual(plain(ctx.parseSender_('"Petrov, Ivan" <ivan@x.bg>')), { name: 'Petrov, Ivan', email: 'ivan@x.bg' });
  assert.deepStrictEqual(plain(ctx.parseSender_('ivan@x.bg')), { name: '', email: 'ivan@x.bg' });
});
