/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness loads isolated server modules. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const env = { NODE_ENV: 'production', ADMIN_SECRET: 'test-desk-password-123', GATE_SECRET: 'test-gate-password-456', SUPER_ADMIN_SECRET: 'test-owner-password-789' };
  const jar = new Map(), records = [];
  let allowed = true, limiterError = null, sensitiveQueries = 0;
  const database = { rpc: async () => ({ data: allowed, error: limiterError }), from(table) {
    if (table !== 'staff_sessions') { sensitiveQueries++; throw new Error('Sensitive database accessed'); }
    const filters = [];
    const chain = {
      select() { return chain; }, eq(k,v) { filters.push(r=>r[k]===v); return chain; }, gt(k,v) { filters.push(r=>r[k]>v); return chain; },
      async maybeSingle() { return { data: records.find(r=>filters.every(f=>f(r))) ?? null, error:null }; },
      async insert(row) { records.push(row); return {error:null}; },
      delete() { return { async in(k, values) { for(let i=records.length-1;i>=0;i--) if(values.includes(records[i][k])) records.splice(i,1); return {error:null}; } }; }
    }; return chain;
  }};
  const loaded = new Map();
  function load(file) {
    if (loaded.has(file)) return loaded.get(file);
    const testModule = {exports:{}};
    const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    function localRequire(name) {
      if(name==='server-only') return {};
      if(name==='next/headers') return {cookies:async()=>({get:n=>jar.has(n)?{value:jar.get(n)}:undefined})};
      if(name==='next/navigation') return {redirect:destination=>{throw new Error('REDIRECT:'+destination);}};
      if(name==='@/lib/supabase') return {supabase:database};
      if(name==='@/lib/staff-auth') return load('lib/staff-auth.ts');
      if(name==='@/lib/security') return load('lib/security.ts');
      if(name==='@/lib/pass-email') return {issuePassEmail(){throw new Error('Unexpected email');}};
      if(name==='@/lib/mail-settings') return {saveGmailSettings(){throw new Error('Unexpected settings update');}};
      if(name==='@/lib/mailer') return {mailFrom:'test@example.com',transporter:{sendMail(){throw new Error('Unexpected email');}}};
      return require(name);
    }
    vm.runInNewContext(code,{module:testModule,exports:testModule.exports,require:localRequire,process:{env},Buffer,console,Request,Date,URL},{filename:file});
    loaded.set(file,testModule.exports); return testModule.exports;
  }
  const auth = load('lib/staff-auth.ts');
  function request(path,body,origin='https://event.example') { return new Request('https://event.example'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}); }
  return { env,jar,records,auth,load,request,setAllowed:v=>allowed=v,setLimiterError:v=>limiterError=v,getSensitiveQueries:()=>sensitiveQueries };
}

test('login rejects weak configuration, bad passwords, cross-origin requests and throttled attempts',async()=>{
 const h=harness(),login=h.load('app/api/staff/login/route.ts').POST;
 assert.equal((await login(h.request('/api/staff/login',{role:'desk',password:h.env.ADMIN_SECRET},'https://attacker.example'))).status,403);
 assert.equal((await login(h.request('/api/staff/login',{role:'desk',password:'wrong'}))).status,401);
 h.setAllowed(false);assert.equal((await login(h.request('/api/staff/login',{role:'desk',password:h.env.ADMIN_SECRET}))).status,429);
 h.setAllowed(true);h.setLimiterError({code:'PGRST202'});assert.equal((await login(h.request('/api/staff/login',{role:'desk',password:h.env.ADMIN_SECRET}))).status,503);
 h.env.ADMIN_SECRET='weak';assert.equal((await login(h.request('/api/staff/login',{role:'desk',password:'weak'}))).status,503);
});
test('successful login stores only a token hash and sets secure, HttpOnly, scoped cookies',async()=>{
 const h=harness();const r=await h.load('app/api/staff/login/route.ts').POST(h.request('/api/staff/login',{role:'desk',password:h.env.ADMIN_SECRET}));
 assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.match(cookie,/__Host-trinity_desk=/);assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=strict/i);assert.match(cookie,/Max-Age=7200/i);
 const token=r.cookies.get('__Host-trinity_desk').value;assert.match(token,/^[a-f0-9]{64}$/);assert.equal(h.records[0].token_hash,h.auth.digest(token));assert.notEqual(h.records[0].token_hash,token);assert.equal(h.records[0].role,'desk');
});
test('missing, tampered, expired, wrong-role and rotated-password sessions are rejected',async()=>{
 const h=harness();assert.equal(await h.auth.staffSession('desk'),false);
 const token=await h.auth.newSession('desk');h.jar.set(h.auth.cookieName('desk'),token);assert.equal(await h.auth.staffSession('desk'),true);
 h.jar.set(h.auth.cookieName('gate'),token);assert.equal(await h.auth.staffSession('gate'),false);
 h.jar.set(h.auth.cookieName('desk'),'a'.repeat(64));assert.equal(await h.auth.staffSession('desk'),false);h.jar.set(h.auth.cookieName('desk'),token);
 h.records[0].expires_at='2000-01-01T00:00:00.000Z';assert.equal(await h.auth.staffSession('desk'),false);h.records[0].expires_at='2099-01-01T00:00:00.000Z';
 h.env.ADMIN_SECRET='changed-password-123';assert.equal(await h.auth.staffSession('desk'),false);
 await assert.rejects(h.auth.requireStaffPage('gate'),/REDIRECT:\/staff\/login\?role=gate/);
});
test('all desk and gate APIs reject unauthenticated callers before database access',async()=>{
 const h=harness();for(const path of ['admin/verify','admin/approve','gate/scan','super-admin/mail','super-admin/retry','super-admin/sender']) { const response=await h.load('app/api/'+path+'/route.ts').POST(h.request('/api/'+path,{code:'ABCD23',id:'00000000-0000-0000-0000-000000000000'}));assert.equal(response.status,401); }
 assert.equal((await h.load('app/api/admin/export/route.ts').GET(new Request('https://event.example/api/admin/export'))).status,401);assert.equal(h.getSensitiveQueries(),0);
});
test('logout revokes server sessions and clears both cookies; cross-origin logout is blocked',async()=>{
 const h=harness(),token=await h.auth.newSession('desk');h.jar.set(h.auth.cookieName('desk'),token);const logout=h.load('app/api/staff/logout/route.ts').POST;
 assert.equal((await logout(h.request('/api/staff/logout',{},'https://attacker.example'))).status,403);assert.equal(h.records.length,1);
 const response=await logout(h.request('/api/staff/logout',{}));assert.equal(response.status,200);assert.equal(h.records.length,0);assert.equal(await h.auth.staffSession('desk'),false);assert.equal(response.cookies.get('__Host-trinity_desk').value,'');assert.equal(response.cookies.get('__Host-trinity_gate').value,'');
});
test('desk and gate sessions cannot change sender credentials or retry uncertain emails',async()=>{
 const h=harness(); for(const role of ['desk','gate']) { const token=await h.auth.newSession(role);h.jar.set(h.auth.cookieName(role),token); }
 for(const path of ['super-admin/sender','super-admin/retry','super-admin/mail']) assert.equal((await h.load('app/api/'+path+'/route.ts').POST(h.request('/api/'+path,{}))).status,401);
 assert.equal((await h.load('app/api/super-admin/mail/route.ts').GET(new Request('https://event.example/api/super-admin/mail'))).status,401);
 const token=await h.auth.newSession('super');h.jar.set(h.auth.cookieName('super'),token);assert.equal(await h.auth.staffSession('super'),true);
 assert.equal((await h.load('app/api/super-admin/sender/route.ts').POST(h.request('/api/super-admin/sender',{},'https://attacker.example'))).status,403);
 h.env.SUPER_ADMIN_SECRET=h.env.ADMIN_SECRET;assert.equal(h.auth.authConfigured('super'),false);assert.equal(await h.auth.staffSession('super'),false);
});
