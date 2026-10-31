import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../edge/google-worker.mjs'
const env = { RELAY_SECRET: 'a'.repeat(43), GOOGLE_CLIENT_ID: 'example.apps.googleusercontent.com' }
const headers = { 'CF-Connecting-IP': '47.109.147.60' }
const make = (path, opts = {}) => new Request('https://relay.example'+path, { headers, ...opts })
test('requires authentication and only permits fixed routes and methods', async () => {
 assert.equal((await worker.fetch(new Request('https://relay.example/certs'),env)).status,403)
 assert.equal((await worker.fetch(make('/https://evil.example'),env)).status,404)
 assert.equal((await worker.fetch(make('/certs?url=https://evil.example'),env)).status,404)
 assert.equal((await worker.fetch(make('/token'),env)).status,405)
 assert.equal((await worker.fetch(make('/certs',{headers:{'CF-Connecting-IP':'192.0.2.1'}}),env)).status,403)
})
test('only forwards fixed Google target without incoming credentials or cookies', async () => {
 const original=globalThis.fetch
 globalThis.fetch=async (url,opts)=>{
  assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs')
  assert.equal(opts.redirect,'error')
  assert.equal(opts.headers.Authorization,undefined)
  assert.equal(opts.headers.Cookie,undefined)
  return new Response('{"keys":[]}',{headers:{'Content-Type':'application/json','Set-Cookie':'bad=1'}})
 }
 try {
  const response=await worker.fetch(make('/certs'),env)
  assert.equal(response.status,200);assert.equal(response.headers.get('Set-Cookie'),null)
  assert.equal(response.headers.get('Cache-Control'),'no-store')
 } finally {globalThis.fetch=original}
})
test('validates token form, client, callback, size; forwards original body only to Google', async () => {
 const original=globalThis.fetch
 let calls=0
 globalThis.fetch=async(url,opts)=>{calls++;assert.equal(url,'https://oauth2.googleapis.com/token');assert.ok(opts.body.includes('code=test-code'));return new Response('{}',{headers:{'Content-Type':'application/json'}})}
 const form=new URLSearchParams({grant_type:'authorization_code',code:'test-code',client_id:env.GOOGLE_CLIENT_ID,client_secret:'test-secret',redirect_uri:'https://yuashie.cn/api/auth/oauth/google/callback',code_verifier:'test-verifier'})
 const post=body=>make('/token',{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body})
 try {
  assert.equal((await worker.fetch(post(form.toString()),env)).status,200)
  form.set('redirect_uri','https://evil.example')
  assert.equal((await worker.fetch(post(form.toString()),env)).status,400)
  assert.equal((await worker.fetch(post('x'.repeat(16385)),env)).status,413)
  assert.equal(calls,1)
 } finally {globalThis.fetch=original}
})
test('upstream errors do not leak request bodies or credentials',async()=>{
 const original=globalThis.fetch
 globalThis.fetch=async()=>{throw new Error('sensitive upstream detail')}
 try {const response=await worker.fetch(make('/certs'),env);assert.equal(response.status,502);assert.equal(await response.text(),'{"error":"upstream_unavailable"}')} finally{globalThis.fetch=original}
})
