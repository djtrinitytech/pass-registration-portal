/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server-module tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness({ state = 'claimed', mailError, accepted = ['attendee@example.com'], finishError, claimError, qrError } = {}) {
  const calls = [], messages = [];
  const student = { id: 'uuid', code: 'ABCD23', sapid: '60018250011', name: '<script>bad</script>', email: 'attendee@example.com', email_attempt_id: 'attempt' };
  const database = { async rpc(name, args) { calls.push({ name, args }); return name === 'claim_pass_email' ? { data: { state, student, message: 'Blocked' }, error: claimError } : { error: finishError }; } };
  const testModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('lib/pass-email.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const templateModule = { exports: {} };
  const templateCode = ts.transpileModule(fs.readFileSync('lib/pass-email-template.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(templateCode, { module: templateModule, exports: templateModule.exports, require: n => n === 'server-only' ? {} : require(n), process });
  const mocks = { 'server-only': {}, '@/lib/supabase': { supabase: database }, 'qrcode': { async toDataURL() { if (qrError) throw qrError; return 'data:image/png;base64,cXI='; } }, '@/lib/mailer': { async getMailer() { return { from: 'sender@gmail.com', senderKey: 'sender-hash', transporter: { close() {}, async sendMail(message) { messages.push(message); if (mailError) throw mailError; return { accepted }; } } }; } } };
  vm.runInNewContext(code, { module: testModule, exports: testModule.exports, require: n => n === '@/lib/pass-email-template' ? templateModule.exports : mocks[n], console: { error() {} } });
  return { issue: testModule.exports.issuePassEmail, calls, messages };
}
test('SMTP acceptance is recorded, QR is attached and attendee HTML is escaped', async () => {
  const h = harness(), result = await h.issue('ABCD23');
  assert.equal(result.status, 200); assert.equal(h.calls[1].args.outcome, 'sent');
  assert.equal(h.calls[0].args.sender_key, 'sender-hash');
  assert.match(h.messages[0].html, /&lt;script&gt;/); assert.doesNotMatch(h.messages[0].html, /<script>/); assert.equal(h.messages[0].attachments[0].encoding, 'base64');
  assert.match(h.messages[0].html, /Friday, 9 October 2026/);assert.match(h.messages[0].html, /60018250011/);
  assert.equal(h.messages[0].attachments.length, 3); assert.equal(h.messages[0].attachments[1].cid, 'trinity-logo'); assert.ok(h.messages[0].attachments[1].content.length > 0);
  assert.match(h.messages[0].text, /Mukesh Patel Hall/);
});
test('explicit SMTP rejection is failed and can be retried; unknown timeout requires owner review', async () => {
  const failed = harness({ mailError: { code: 'EENVELOPE', responseCode: 550 } }); assert.equal((await failed.issue('ABCD23')).status, 502); assert.equal(failed.calls[1].args.outcome, 'failed');
  const uncertain = harness({ mailError: { code: 'ETIMEDOUT' } }); assert.equal((await uncertain.issue('ABCD23')).email_status, 'unknown'); assert.equal(uncertain.calls[1].args.outcome, 'unknown');
  const rejected = harness({ accepted: [] }); assert.equal((await rejected.issue('ABCD23')).email_status, 'failed');
  const preparation = harness({ qrError: new Error('QR failed') }); assert.equal((await preparation.issue('ABCD23')).email_status, 'failed'); assert.equal(preparation.messages.length, 0);
});
test('in-progress, sent, paused, quota and uncertain claims never send an email', async () => {
  for (const state of ['sending', 'sent', 'paused', 'quota', 'unknown']) { const h = harness({ state }); assert.equal((await h.issue('ABCD23')).status, 409); assert.equal(h.messages.length, 0); assert.equal(h.calls.length, 1); }
});
test('tracking failure after SMTP acceptance forbids automatic resend; migration failure sends nothing', async () => {
  const h = harness({ finishError: { message: 'unavailable' } }); const result = await h.issue('ABCD23'); assert.equal(result.status, 503); assert.match(result.error, /accepted/); assert.equal(h.messages.length, 1);
  const missing = harness({ claimError: {} }); await assert.rejects(missing.issue('ABCD23'), /migration/); assert.equal(missing.messages.length, 0);
});
test('only explicit owner review is passed to uncertain-send claim', async () => {
  const h = harness(); await h.issue('ABCD23', true); assert.equal(h.calls[0].args.allow_uncertain, true);
});
