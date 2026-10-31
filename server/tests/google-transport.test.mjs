import test from 'node:test'
import assert from 'node:assert/strict'
import {createGoogleTransport} from '../src/google-transport.js'
test('routes token and key requests only, preserves body and TLS defaults',async()=>{
 let calls=[]
 const fetch=createGoogleTransport({GOOGLE_AUTH_RELAY_ORIGIN:'https://google-auth.yuashie.com'},async(u,o)=>{calls.push([String(u),o]);return new Response('{}')})
 const body='code=test-code&client_secret=test-secret'
 await fetch('https://oauth2.googleapis.com/token',{method:'POST',body})
 await fetch(new URL('https://www.googleapis.com/oauth2/v3/certs'),{signal:AbortSignal.timeout(1000)})
 await fetch('https://api.github.com/user',{headers:{Authorization:'test'}})
 assert.equal(calls[0][0],'https://google-auth.yuashie.com/token');assert.equal(calls[0][1].body,body);assert.equal(calls[0][1].redirect,'error')
 assert.equal(calls[1][0],'https://google-auth.yuashie.com/certs');assert.ok(calls[1][1].signal)
 assert.equal(calls[2][0],'https://api.github.com/user')
})
test('rejects unexpected relay origin and keeps existing direct mode',async()=>{
 const bad=createGoogleTransport({GOOGLE_AUTH_RELAY_ORIGIN:'https://evil.example'},async()=>{throw new Error('must not send')})
 await assert.rejects(bad('https://oauth2.googleapis.com/token'),/Invalid Google auth relay/)
 let target
 await createGoogleTransport({},async u=>{target=u;return new Response('{}')})('https://oauth2.googleapis.com/token')
 assert.equal(target,'https://oauth2.googleapis.com/token')
})
