/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server-route tests. */
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function harness(found = true) {
  const filters = [], testModule = { exports: {} };
  const record = { code: 'ABCD23', sapid: '60018250011', name: 'Example attendee' };
  const database = { from() { return { select() { return this; }, eq(key, value) { filters.push({ key, value }); return this; }, async maybeSingle() { return { data: found ? record : null, error: null }; } }; } };
  const mocks = { '@/lib/staff-auth': { async staffApiError() { return null; } }, '@/lib/supabase': { supabase: database }, '@/lib/security': { normalizeCode: v => typeof v === 'string' ? v.trim().toUpperCase() : '' } };
  const code = ts.transpileModule(fs.readFileSync('app/api/admin/verify/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module: testModule, exports: testModule.exports, require: n => n in mocks ? mocks[n] : require(n), console });
  return { filters, async search(body) { return testModule.exports.POST(new Request('https://event.example/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })); } };
}
test('desk lookup accepts normalized codes and SAP IDs without losing leading zeros', async () => {
  const h = harness(); assert.equal((await h.search({ query: ' abcd23 ' })).status, 200); assert.equal(h.filters[0].key, 'code');assert.equal(h.filters[0].value, 'ABCD23');
  const response = await h.search({ query: '60018250011' }); assert.equal((await response.json()).registration.code, 'ABCD23');assert.equal(h.filters[1].key, 'sapid');
  await h.search({ query: '00018250011' }); assert.equal(h.filters[2].value, '00018250011');
  assert.equal((await h.search({ code: 'ABCD23' })).status, 200);
});
test('malformed searches are rejected before querying; missing SAP ID returns a useful message', async () => {
  const h = harness();for(const query of ['', 60018250011, '1', 'code.eq.ABCD23,sapid.gt.0', '123456789012345678901']) assert.equal((await h.search({ query })).status, 400);assert.equal(h.filters.length, 0);
  const missing = harness(false), response = await missing.search({ query: '60018250011' });assert.equal(response.status, 404);assert.match((await response.json()).error, /SAP ID/);
});
