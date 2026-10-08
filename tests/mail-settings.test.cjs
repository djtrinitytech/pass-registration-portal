/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server-module tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function harness() {
  const env = { MAIL_SETTINGS_KEY: 'ab'.repeat(32) }, saved = []; let verificationError;
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/mail-settings.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mocks = { 'server-only': {}, '@/lib/supabase': { supabase: { from() { return { async upsert(value) { saved.push(value); return { error: null }; } }; } } }, nodemailer: { createTransport() { return { async verify() { if (verificationError) throw verificationError; }, close() {} }; } } };
  vm.runInNewContext(code, { module: testModule, exports: testModule.exports, require: name => name in mocks ? mocks[name] : require(name), process: { env }, Buffer, Date });
  return { settings: testModule.exports, env, saved, failVerification() { verificationError = new Error('Authentication failed'); } };
}
test('sender passwords are encrypted with randomized authenticated encryption and tampering is rejected', () => {
  const h = harness(), credentials = { user: 'owner@gmail.com', password: 'abcdefghijklmnop' };
  const encrypted = h.settings.encryptSettings(credentials), second = h.settings.encryptSettings(credentials);
  assert.notEqual(encrypted, second); assert.ok(!encrypted.includes(credentials.password));
  assert.equal(h.settings.decryptSettings(encrypted).password, credentials.password);
  const parts = encrypted.split('.'); parts[1] = '00'.repeat(16); assert.throws(() => h.settings.decryptSettings(parts.join('.')));
  h.env.MAIL_SETTINGS_KEY = 'cd'.repeat(32); assert.throws(() => h.settings.decryptSettings(encrypted));
  h.env.MAIL_SETTINGS_KEY = 'weak'; assert.throws(() => h.settings.encryptSettings(credentials), /MAIL_SETTINGS_KEY/);
});
test('only verified Gmail credentials are saved; regular passwords and failed sign-ins preserve the sender', async () => {
  const h = harness(); await assert.rejects(h.settings.saveGmailSettings('owner@gmail.com', 'regular-password'), /16-character/);
  await assert.rejects(h.settings.saveGmailSettings('owner@example.com', 'abcdefghijklmnop'), /personal Gmail/);
  h.failVerification(); await assert.rejects(h.settings.saveGmailSettings('owner@gmail.com', 'abcdefghijklmnop'), /sign-in failed/); assert.equal(h.saved.length, 0);
  const good = harness(); await good.settings.saveGmailSettings('Owner@gmail.com', 'abcd efgh ijkl mnop'); assert.equal(good.saved.length, 1); assert.equal(good.settings.decryptSettings(good.saved[0].encrypted_credentials).password, 'abcdefghijklmnop');
});
test('Gmail aliases share a sending budget; distinct Gmail accounts have separate budgets', () => {
  const h = harness(); assert.equal(h.settings.senderKey('owner.name+event@googlemail.com'), h.settings.senderKey('ownername@gmail.com'));
  assert.notEqual(h.settings.senderKey('owner@gmail.com'), h.settings.senderKey('other@gmail.com'));
});
