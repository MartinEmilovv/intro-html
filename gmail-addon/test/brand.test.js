// Run with: node --test test/brand.test.js
// Tests that branding values from the Settings tab are cleaned up safely.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Brand.gs'), 'utf8'), ctx);

test('brand colors are normalized, invalid ones fall back to the default', () => {
  assert.strictEqual(ctx.safeColor_('#E30613'), '#e30613');
  assert.strictEqual(ctx.safeColor_('e30613'), '#e30613');
  assert.strictEqual(ctx.safeColor_(' #abc '), '#aabbcc');
  assert.strictEqual(ctx.safeColor_('red'), '#1d5b86');
  assert.strictEqual(ctx.safeColor_('#12345'), '#1d5b86');
  assert.strictEqual(ctx.safeColor_(''), '#1d5b86');
});

test('logo links must be https', () => {
  assert.strictEqual(ctx.safeLogoUrl_(' https://example.com/logo.png '), 'https://example.com/logo.png');
  assert.strictEqual(ctx.safeLogoUrl_('http://example.com/logo.png'), '');
  assert.strictEqual(ctx.safeLogoUrl_('javascript:alert(1)'), '');
  assert.strictEqual(ctx.safeLogoUrl_('https://example.com/a b.png'), '');
  assert.strictEqual(ctx.safeLogoUrl_(''), '');
});

test('assistant name: company name if set, else Freight Assistant', () => {
  assert.strictEqual(ctx.assistantName_({ assistantName: '  Orbit Assistant ' }), 'Orbit Assistant');
  assert.strictEqual(ctx.assistantName_({ assistantName: '' }), 'Freight Assistant');
  assert.strictEqual(ctx.assistantName_({}), 'Freight Assistant');
  assert.strictEqual(ctx.assistantName_({ assistantName: 'x'.repeat(60) }).length, 40);
});
