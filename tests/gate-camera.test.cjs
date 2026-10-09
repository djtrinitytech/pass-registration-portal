/* eslint-disable @typescript-eslint/no-require-imports -- Isolated camera lifecycle regression tests. */
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function harness() {
  const hooks = [], effects = [], scanners = []; let cursor = 0, requests = 0, ok = true;
  const react = {
    useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
    useState(value) { const i = cursor++; hooks[i] ??= { value }; return [hooks[i].value, v => { hooks[i].value = typeof v === 'function' ? v(hooks[i].value) : v; }]; },
    useEffect(callback, deps) { const i = cursor++; const old = hooks[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) { hooks[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); hooks[i].cleanup = callback(); }); } },
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '@/components/staff-logout': { StaffLogout: 'logout' }, 'lucide-react': { CheckCircle2: 'check', RotateCcw: 'retry', ShieldAlert: 'alert', X: 'close' }, 'html5-qrcode': { Html5Qrcode: class {
    constructor() { this.starts = 0; this.stops = 0; this.clears = 0; scanners.push(this); }
    async start(camera, config, callback) { this.starts++; this.scan = callback; }
    async stop() { this.stops++; } clear() { this.clears++; }
  } } };
  const testModule = { exports: {} }, code = ts.transpileModule(fs.readFileSync('components/gate-scanner.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module: testModule, exports: testModule.exports, require: n => mocks[n], AbortController, Date, window: { setTimeout, clearTimeout, location: { assign() {} } }, fetch: async () => { requests++; return { ok, status: ok ? 200 : 409, async json() { return { message: ok ? 'ENTRY GRANTED' : 'ALREADY USED' }; } }; } });
  function render() { cursor = 0; const tree = testModule.exports.GateScanner(); while (effects.length) effects.shift()(); return tree; }
  function find(tree, predicate) { if (!tree || typeof tree !== 'object') return null; if (Array.isArray(tree)) { for (const item of tree) { const found = find(item, predicate); if (found) return found; } return null; } if (predicate(tree)) return tree; return find(tree.props?.children, predicate); }
  return { render, find, scanners, requests: () => requests, deny() { ok = false; }, unmount() { hooks.forEach(h => h?.cleanup?.()); } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('camera stays running through granted and denied popups and next-pass scanning', async () => {
  const h = harness(); h.render(); await settle(); const scanner = h.scanners[0];
  await Promise.all([scanner.scan('first-pass'), scanner.scan('first-pass')]); assert.equal(h.requests(), 1);
  let tree = h.render(); assert.ok(h.find(tree, n => n.props?.id === 'gate-reader')); assert.ok(h.find(tree, n => n.props?.role === 'dialog')); assert.equal(scanner.stops, 0);
  await scanner.scan('second-pass'); assert.equal(h.requests(), 1, 'popup blocks further requests');
  h.find(tree, n => n.props?.className === 'scan-popup-backdrop').props.onClick(); tree = h.render(); assert.equal(h.find(tree, n => n.props?.role === 'dialog'), null);
  await scanner.scan('first-pass'); assert.equal(h.requests(), 1, 'held QR does not instantly trigger again');
  h.deny(); await scanner.scan('second-pass'); tree = h.render(); assert.ok(h.find(tree, n => n.props?.className === 'scan-popup danger')); assert.ok(h.find(tree, n => n.props?.id === 'gate-reader'));
  assert.equal(scanner.starts, 1); assert.equal(scanner.stops, 0);
  h.unmount(); await settle(); assert.equal(scanner.stops, 1); assert.equal(scanner.clears, 1);
});
test('unmount before scanner import completes never starts a camera', async () => {
  const h = harness();h.render();h.unmount();await settle();assert.equal(h.scanners.length, 0);
});
