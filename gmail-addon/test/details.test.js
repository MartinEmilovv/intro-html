// Run with: node --test test/details.test.js
// Tests the extra request details: the date rule, several trucks, template fields,
// carrier conversations in the transport folder, and the template converter.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['Config.gs', 'Claude.gs', 'History.gs', 'Carriers.gs', 'Quotes.gs', 'Orders.gs',
  'Brand.gs', 'Requests.gs', 'Setup.gs', 'I18n.gs', 'Templates.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const day = (y, m, d) => new Date(y, m - 1, d);

// ---- Date rule ------------------------------------------------------------------

test('a date without a year gets the current year', () => {
  assert.strictEqual(ctx.resolveDate_('12-03', day(2026, 11, 20)), '2026-12-03');
  assert.strictEqual(ctx.resolveDate_('3-7', day(2026, 1, 10)), '2026-03-07');
});

test('a date without a year that has passed means next year', () => {
  assert.strictEqual(ctx.resolveDate_('01-05', day(2026, 12, 15)), '2027-01-05');
  assert.strictEqual(ctx.resolveDate_('11-12', day(2026, 11, 20)), '2027-11-12');
});

test('today itself stays this year', () => {
  assert.strictEqual(ctx.resolveDate_('11-20', day(2026, 11, 20)), '2026-11-20');
});

test('full dates and other text are left as they are', () => {
  assert.strictEqual(ctx.resolveDate_('2026-12-01', day(2026, 11, 20)), '2026-12-01');
  assert.strictEqual(ctx.resolveDate_('end of week 48', day(2026, 11, 20)), 'end of week 48');
  assert.strictEqual(ctx.resolveDate_('', day(2026, 11, 20)), '');
});

test('delivery without a year is placed on or after loading', () => {
  const r = plain(ctx.resolveRequestDates_({ loading_date: '12-30', delivery_date: '01-03' }, day(2026, 12, 20)));
  assert.strictEqual(r.loading_date, '2026-12-30');
  assert.strictEqual(r.delivery_date, '2027-01-03');
});

// ---- Several trucks -----------------------------------------------------------------

test('the suggestion is multiplied for several trucks', () => {
  const s = { sell: 2500, carrier: 2090, margin: 410, basedOn: 5 };
  assert.deepStrictEqual(plain(ctx.scaleSuggestion_(s, 2)),
    { sell: 5000, carrier: 4180, margin: 820, basedOn: 5, trucks: 2 });
  assert.strictEqual(ctx.scaleSuggestion_(s, 1), s);
  assert.strictEqual(ctx.scaleSuggestion_(s, null), s);
  assert.strictEqual(ctx.scaleSuggestion_(null, 3), null);
});

// ---- Carrier price requests ----------------------------------------------------------

test('carrier price requests include the new details but not the consignee', () => {
  const load = plain(ctx.carrierLoad_({
    from_city: 'Sofia', to_city: 'Duisburg', truck_count: 2, loading_time: '08:00',
    customs_points: 'Sofia', special_requirements: 'ADR', consignee: 'Müller GmbH', contact_name: 'Иван',
  }));
  assert.strictEqual(load.truck_count, 2);
  assert.strictEqual(load.loading_time, '08:00');
  assert.strictEqual(load.customs_points, 'Sofia');
  assert.strictEqual(load.special_requirements, 'ADR');
  assert.ok(!JSON.stringify(load).includes('Müller'));
  assert.ok(!JSON.stringify(load).includes('Иван'));
});

// ---- Template fields -----------------------------------------------------------------------

test('field markers are found once each, in order', () => {
  assert.deepStrictEqual(plain(ctx.placeholdersIn_('{{price}} {{consignee}} x {{price}} {{ bad }} {{Bad}}')),
    ['price', 'consignee']);
});

test('the order form asks for template fields we cannot fill ourselves', () => {
  const plan = plain(ctx.templateFieldPlan_(
    ['order_number', 'price', 'loading_place', 'consignee', 'customs_points', 'adr_class'],
    { consignee: 'Müller GmbH', customs_points: '' }));
  assert.deepStrictEqual(plan, [
    { name: 'consignee', value: 'Müller GmbH', known: true },
    { name: 'customs_points', value: '', known: true },
    { name: 'adr_class', value: '', known: false },
  ]);
});

const settings = { companyName: 'X', clientPaymentTerms: '30 дни', carrierPaymentTerms: '45 дни' };
const order = {
  number: '2026-0001', date: '20.11.2026', client_name: 'Клиент ООД', sell_eur: 2500,
  carrier_name: 'Превозвач ЕООД', carrier_contact: 'Георги', carrier_eur: 2080,
  truck_count: 2, loading_time: '08:00', consignee: 'Müller GmbH', customs_points: 'Sofia',
  special_requirements: 'ADR',
};

test('the new details go on both orders', () => {
  for (const side of ['client', 'carrier']) {
    const f = plain(ctx.buildOrderFields_(order, side, settings));
    assert.strictEqual(f.truck_count, '2');
    assert.strictEqual(f.loading_time, '08:00');
    assert.strictEqual(f.consignee, 'Müller GmbH');
    assert.strictEqual(f.customs_points, 'Sofia');
    assert.strictEqual(f.special_requirements, 'ADR');
  }
});

test('order form values fill template fields but can never change prices or parties', () => {
  const withExtra = { ...order, template_values: {
    consignee: 'Corrected GmbH', adr_class: '3', price: '1', client: 'Hacked', carrier: 'Hacked',
    payment_terms: 'never', company: 'Other' } };
  const client = plain(ctx.buildOrderFields_(withExtra, 'client', settings));
  const carrier = plain(ctx.buildOrderFields_(withExtra, 'carrier', settings));
  assert.strictEqual(client.consignee, 'Corrected GmbH');
  assert.strictEqual(client.adr_class, '3');
  assert.strictEqual(client.price, '2 500 EUR');
  assert.strictEqual(client.client, 'Клиент ООД');
  assert.strictEqual(client.carrier, undefined);
  assert.strictEqual(client.payment_terms, '30 дни');
  assert.strictEqual(carrier.price, '2 080 EUR');
  assert.strictEqual(carrier.carrier, 'Превозвач ЕООД');
  assert.strictEqual(carrier.client, undefined);
  assert.strictEqual(carrier.company, 'X');
});

// ---- Carrier conversations ------------------------------------------------------------------

test('carrier conversations: those started after the request, or naming the order', () => {
  const requestAt = day(2026, 11, 10).getTime();
  const threads = [
    { id: 'old', subject: 'Другa поръчка', startedAt: day(2026, 10, 1).getTime() },
    { id: 'quote', subject: 'Запитване: София – Дуисбург', startedAt: day(2026, 11, 10).getTime() + 3600e3 },
    { id: 'order', subject: 'Заявка № 2026-0001: Sofia → Duisburg', startedAt: day(2026, 9, 1).getTime() },
    { id: 'daybefore', subject: 'Re: свободен камион', startedAt: day(2026, 11, 9).getTime() + 7200e3 },
  ];
  const picked = plain(ctx.pickCarrierThreads_(threads, { number: '2026-0001', request_date: requestAt })).map((t) => t.id);
  assert.deepStrictEqual(picked, ['quote', 'order', 'daybefore']);
});

// ---- Template converter ----------------------------------------------------------------------

test('Drive links of every kind give the file ID', () => {
  const id = '1TDQPyUJLKOdebS02_dg4Xa61K7wWHGGi';
  assert.strictEqual(ctx.parseDriveFileId_('https://drive.google.com/file/d/' + id + '/view?usp=sharing'), id);
  assert.strictEqual(ctx.parseDriveFileId_('https://docs.google.com/document/d/' + id + '/edit'), id);
  assert.strictEqual(ctx.parseDriveFileId_('https://drive.google.com/open?id=' + id), id);
  assert.strictEqual(ctx.parseDriveFileId_(id), id);
  assert.strictEqual(ctx.parseDriveFileId_('https://example.com/file.doc'), null);
});

// Lines from a real client заявка (structure only), with the blank styles it uses.
const realLines = [
  '    2. Дата и час на товарене: …………………………………………………………………',
  '6.  Получател на товара по ЧМР: ………………………………………………………….',
  '7.  Спедиторско възнаграждение и превозно навло: …………………………………..',
  'Автомобил №  ……………………………….',
  '8. Обмитяващи митници: ...........',
  'Тегло (кг): ________',
];

test('blank pattern finds the blank after each label, whatever the dots look like', () => {
  const cases = [
    ['2. Дата и час на товарене:', 0], ['6.  Получател на товара по ЧМР:', 1],
    ['7.  Спедиторско възнаграждение и превозно навло:', 2], ['Автомобил №', 3],
    ['8. Обмитяващи митници:', 4], ['Тегло (кг):', 5],
  ];
  for (const [label, line] of cases) {
    const re = new RegExp(ctx.blankPattern_(label));
    assert.ok(re.test(realLines[line]), 'not found: ' + label);
    const replaced = realLines[line].replace(re, label + ' {{x}}');
    assert.ok(!/[.…_]{3,}/.test(replaced), 'dots left: ' + replaced);
  }
});

test('labels with brackets or dots are matched literally', () => {
  assert.strictEqual(ctx.escapeRegex_('Тегло (кг.):'), 'Тегло \\(кг\\.\\):');
  assert.ok(!new RegExp(ctx.blankPattern_('Тегло (кг):')).test('Тегло кг: ......'));
});

test('the mapping from Claude is cleaned: bad names and empty entries dropped', () => {
  const cleaned = plain(ctx.cleanTemplateMapping_([
    { label: ' Дата и час на товарене: ', fields: ['loading_date', 'loading_time'] },
    { label: 'Брой:', fields: ['Truck Count', 'truck_count'] },
    { label: 'x', fields: ['cargo'] },
    { label: 'Подпис:', fields: [] },
  ]));
  assert.deepStrictEqual(cleaned, [
    { label: 'Дата и час на товарене:', fields: ['loading_date', 'loading_time'] },
    { label: 'Брой:', fields: ['truck_count'] },
  ]);
  assert.strictEqual(ctx.fieldMarkers_(['loading_date', 'loading_time']), '{{loading_date}} {{loading_time}}');
});

test('every converter field has a label in the order form, in both languages', () => {
  for (const name of ctx.ASK_FIELDS) {
    assert.ok(ctx.UI_TEXT['field_' + name], 'field_' + name);
  }
  for (const name of Object.keys(ctx.TEMPLATE_FIELD_HELP)) {
    assert.ok(ctx.AUTO_FIELDS.includes(name) || ctx.ASK_FIELDS.includes(name), name + ' is neither filled nor asked');
  }
});
