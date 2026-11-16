// Run with: node --test test/ack.test.js
// Loads Config.gs and Ack.gs (plain JavaScript) and tests who gets an
// acknowledgment and what it says.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['Config.gs', 'Ack.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx);
}

const base = {
  messageCount: 1, from: 'Иван Петров <ivan@example.bg>', me: 'me@gmail.com',
  includeOwn: false, isList: false,
};

test('a new email from a person is a candidate', () => {
  assert.strictEqual(ctx.isAckCandidate_(base), true);
});

test('threads with more than one message are skipped', () => {
  assert.strictEqual(ctx.isAckCandidate_({ ...base, messageCount: 2 }), false);
});

test('mailing lists and no-reply senders are skipped', () => {
  assert.strictEqual(ctx.isAckCandidate_({ ...base, isList: true }), false);
  assert.strictEqual(ctx.isAckCandidate_({ ...base, from: 'Shop <no-reply@shop.com>' }), false);
  assert.strictEqual(ctx.isAckCandidate_({ ...base, from: 'noreply@bank.bg' }), false);
  assert.strictEqual(ctx.isAckCandidate_({ ...base, from: 'Mail Delivery <mailer-daemon@googlemail.com>' }), false);
});

test('own emails are skipped unless testing is switched on', () => {
  const own = { ...base, from: 'Me <ME@gmail.com>' };
  assert.strictEqual(ctx.isAckCandidate_(own), false);
  assert.strictEqual(ctx.isAckCandidate_({ ...own, includeOwn: true }), true);
});

test('Bulgarian acknowledgment with the name', () => {
  assert.strictEqual(ctx.buildAckBody_('bg', 'Иван Петров', ''),
    'Здравейте, Иван Петров,\n\nБлагодарим Ви за запитването. Работим по него и ще Ви изпратим ' +
    'оферта възможно най-скоро.\n\nПоздрави,');
});

test('no name gives a plain greeting, and the signature is added', () => {
  const body = ctx.buildAckBody_('en', '  ', 'Martin, Example Ltd');
  assert.ok(body.startsWith('Hello,\n'));
  assert.ok(body.endsWith('Best regards,\nMartin, Example Ltd'));
});

test('other languages fall back to English', () => {
  assert.ok(ctx.buildAckBody_('de', 'Hans Müller', '').startsWith('Hello Hans Müller,'));
});
