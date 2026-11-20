// Run with: node --test test/testmode.test.js
// Tests test mode (carrier emails go to your own tagged address), the simulated
// carrier replies, and matching a carrier's reply to its price request.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['Config.gs', 'Claude.gs', 'History.gs', 'Carriers.gs', 'Quotes.gs', 'Orders.gs', 'Brand.gs',
  'Requests.gs', 'Setup.gs', 'I18n.gs', 'Templates.gs', 'Main.gs', 'Test.gs', 'Replies.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const me = 'martinemilovv@gmail.com';

// ---- Test mode ---------------------------------------------------------------------

test('in test mode every carrier email goes to your own tagged address', () => {
  assert.strictEqual(ctx.testRecipient_('georgi@primer-trans.example', me, true), 'martinemilovv+primer-trans@gmail.com');
  assert.strictEqual(ctx.testRecipient_('offers@real-carrier.bg', me, true), 'martinemilovv+real-carrier@gmail.com');
});

test('outside test mode carrier emails are untouched', () => {
  assert.strictEqual(ctx.testRecipient_('offers@real-carrier.bg', me, false), 'offers@real-carrier.bg');
});

test('tags are safe and an existing tag in your address is replaced', () => {
  assert.strictEqual(ctx.carrierSlug_('x@Демо_Карго!.example'), 'carrier');
  assert.strictEqual(ctx.carrierSlug_('a@Sample-Haulage.example'), 'sample-haulage');
  assert.strictEqual(ctx.plusAddress_('me+old@gmail.com', 'new'), 'me+new@gmail.com');
});

test('test drafts are marked [TEST] once', () => {
  assert.strictEqual(ctx.testSubject_('Запитване: София – Дуисбург', true), '[TEST] Запитване: София – Дуисбург');
  assert.strictEqual(ctx.testSubject_('[TEST] X', true), '[TEST] X');
  assert.strictEqual(ctx.testSubject_('X', false), 'X');
});

// ---- Simulated replies --------------------------------------------------------------------

const request = { from_city: 'Sofia', to_city: 'Duisburg', to_country: 'DE', loading_date: '2026-12-12', delivery_date: '' };

test('simulated price is near the carrier\'s past price, rounded, times trucks', () => {
  const low = plain(ctx.simulatedQuote_(request, {}, 2140, 0, new Date(2026, 10, 20)));
  const high = plain(ctx.simulatedQuote_(request, {}, 2140, 1, new Date(2026, 10, 20)));
  assert.strictEqual(low.price, 2010);   // 2140 * 0.94
  assert.strictEqual(high.price, 2270);  // 2140 * 1.06
  const two = plain(ctx.simulatedQuote_({ ...request, truck_count: 2 }, {}, 2140, 0, new Date(2026, 10, 20)));
  assert.strictEqual(two.price, 4020);
});

test('simulated dates: the requested loading date, delivery after typical transit', () => {
  const q = plain(ctx.simulatedQuote_(request, {}, 2000, 0.5, new Date(2026, 10, 20)));
  assert.strictEqual(q.loading_date, '2026-12-12');
  assert.strictEqual(q.delivery_date, '2026-12-15');
  const noDate = plain(ctx.simulatedQuote_({ to_country: 'RO' }, {}, 0, 0.5, new Date(2026, 10, 20)));
  assert.strictEqual(noDate.loading_date, '2026-11-22');
  assert.strictEqual(noDate.delivery_date, '2026-11-23');
  assert.strictEqual(noDate.price, 2000);
});

test('simulated reply is in the carrier\'s language and marked as simulated', () => {
  const quote = { price: 2150, loading_date: '2026-12-12', delivery_date: '2026-12-15' };
  const bg = ctx.simulatedReplyBody_(quote, request, { name: 'Пример Транс ЕООД', contact: 'Георги', language: 'bg' });
  assert.ok(bg.includes('за 2 150 EUR без ДДС'));
  assert.ok(bg.includes('Товарене: 12.12.2026') && bg.includes('Доставка: 15.12.2026'));
  assert.ok(bg.includes('Симулиран отговор'));
  const en = ctx.simulatedReplyBody_(quote, request, { name: 'Sample Haulage SRL', contact: 'Andrei', language: 'en' });
  assert.ok(en.includes('for 2 150 EUR excl. VAT') && en.includes('Simulated reply'));
});

test('the reply email is threaded and readable (headers and Cyrillic encoded)', () => {
  const mime = ctx.buildReplyMime_({
    fromName: 'Георги, Пример Транс', fromEmail: 'martinemilovv+primer-trans@gmail.com', to: me,
    subject: 'Re: [TEST] Запитване', date: 'Fri, 20 Nov 2026 10:00:00 GMT', messageId: 'abc@test',
    inReplyTo: '<orig@mail.gmail.com>', body: 'Здравейте,\n' + 'x'.repeat(200),
  }, b64);
  assert.ok(mime.includes('From: =?UTF-8?B?' + b64('Георги, Пример Транс') + '?= <martinemilovv+primer-trans@gmail.com>'));
  assert.ok(mime.includes('Subject: =?UTF-8?B?' + b64('Re: [TEST] Запитване') + '?='));
  assert.ok(mime.includes('In-Reply-To: <orig@mail.gmail.com>\r\nReferences: <orig@mail.gmail.com>'));
  const body = mime.split('\r\n\r\n')[1];
  assert.ok(body.split('\r\n').every((line) => line.length <= 76));
  assert.strictEqual(Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8'), 'Здравейте,\n' + 'x'.repeat(200));
  assert.ok(mime.includes('To: ' + me));
});

// ---- Matching replies ----------------------------------------------------------------------

test('subjects are compared without Re:/Fwd:/Отг:/[TEST]', () => {
  assert.strictEqual(ctx.normalizeSubject_('Re: Fwd: [TEST] Запитване:  София'), 'запитване: софия');
  assert.strictEqual(ctx.normalizeSubject_('Отг: Запитване: София'), 'запитване: софия');
  assert.strictEqual(ctx.normalizeSubject_('AW: RE[2]: Offer'), 'offer');
});

test('a reply is matched to the price request sent to that sender', () => {
  const now = new Date(2026, 10, 20, 12);
  const rows = [
    { date: new Date(2026, 10, 19), request: 'req-old', carrier: 'A', recipient: 'a@x.bg', subject: 'Other route' },
    { date: new Date(2026, 10, 20), request: 'req-new', carrier: 'A', recipient: 'a@x.bg', subject: '[TEST] Запитване: София' },
    { date: new Date(2026, 10, 20), request: 'req-b', carrier: 'B', recipient: 'b@x.bg', subject: 'Запитване: София' },
    { date: new Date(2026, 8, 1), request: 'req-ancient', carrier: 'C', recipient: 'c@x.bg', subject: 'x' },
  ];
  assert.strictEqual(ctx.findPriceRequest_(rows, 'A@X.bg', 'Re: [TEST] Запитване: София', now).request, 'req-new');
  assert.strictEqual(ctx.findPriceRequest_(rows, 'a@x.bg', 'Re: Other route', now).request, 'req-old');
  assert.strictEqual(ctx.findPriceRequest_(rows, 'a@x.bg', 'something else', now).request, 'req-new');
  assert.strictEqual(ctx.findPriceRequest_(rows, 'c@x.bg', 'x', now), null); // older than 30 days
  assert.strictEqual(ctx.findPriceRequest_(rows, 'nobody@x.bg', 'x', now), null);
});

test('missing columns are added at the end, existing ones keep their place', () => {
  assert.deepStrictEqual(plain(ctx.missingColumns_(['date', 'request', 'Route', 'carrier', 'price_eur', 'source'],
    ctx.QUOTES_HEADER)), ['loading_date', 'delivery_date']);
  assert.deepStrictEqual(plain(ctx.missingColumns_(ctx.QUOTES_HEADER, ctx.QUOTES_HEADER)), []);
});
