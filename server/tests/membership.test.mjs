import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import crypto from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { AlipaySdk } from 'alipay-sdk'
import { registerMembership, plans } from '../src/membership.js'

test('signed Alipay payments bind amounts and accounts, grant once and renew once', async t => {
 const db = new PGlite()
 await db.exec('CREATE TABLE users(id BIGINT PRIMARY KEY); INSERT INTO users VALUES(1),(2)')
 await db.exec(await readFile(new URL('../sql/011_membership.sql',import.meta.url),'utf8'))
 const pool = { query: (sql,v) => db.query(sql,v), connect: async () => ({ query: (sql,v) => db.query(sql,v), release() {} }) }
 const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}})
 const config = { ALIPAY_ENABLED:'true',MEMBERSHIP_SALES_ENABLED:'true',ALIPAY_APP_ID:'app1',ALIPAY_SELLER_ID:'seller1',ALIPAY_PRIVATE_KEY:privateKey,ALIPAY_PUBLIC_KEY:publicKey }
 const sdk = new AlipaySdk({appId:'app1',privateKey,alipayPublicKey:publicKey,keyType:'PKCS8'})
 const app = Fastify()
 await registerMembership(app,{pool,config,sdk,origin:'https://yuashie.cn', requireUser:async(req,reply) => req.headers['x-test-user'] ? {id:Number(req.headers['x-test-user'])} : (reply.code(401).send({message:'login'}),null)})
 t.after(async()=>{await app.close();await db.close()})
 const buy = async (planId='monthly_6') => app.inject({method:'POST',url:'/api/membership/orders',headers:{'x-test-user':'1'},payload:{planId,amount:'0.01'}})
 const notify = async fields => {
  const data = {app_id:'app1',seller_id:'seller1',total_amount:'6.00',trade_no:'2026102900000001',trade_status:'TRADE_SUCCESS',...fields}
  const content = Object.keys(data).sort().map(k=>`${k}=${data[k]}`).join('&')
  const sign = crypto.sign('RSA-SHA256',Buffer.from(content),privateKey).toString('base64')
  return app.inject({method:'POST',url:'/api/payments/alipay/notify',headers:{'content-type':'application/x-www-form-urlencoded'},payload:new URLSearchParams({...data,sign_type:'RSA2',sign}).toString()})
 }
 assert.deepEqual(plans.map(p=>p.price),[6,18,25])
 assert.equal((await app.inject({method:'POST',url:'/api/membership/orders',payload:{planId:'monthly_6'}})).statusCode,401)
 assert.equal((await buy('monthly_1')).statusCode,400)
 assert.equal((await buy('monthly_68')).statusCode,400)
 const creation = await buy(); assert.equal(creation.statusCode,200,creation.body)
 const order = creation.json()
 assert.match(order.payUrl,/^https:\/\/openapi.alipay.com\//)
 assert.equal((await app.inject({url:`/api/membership/orders/${order.id}`,headers:{'x-test-user':'2'}})).statusCode,404)
 for (const mismatch of [{total_amount:'0.01'},{app_id:'other'},{seller_id:'other'},{trade_status:'WAIT_BUYER_PAY'}]) assert.equal((await notify({out_trade_no:order.id,...mismatch})).statusCode,400)
 assert.equal((await app.inject({method:'POST',url:'/api/payments/alipay/notify',payload:{out_trade_no:order.id,sign_type:'RSA2',sign:'forged'}})).statusCode,400)
 assert.equal((await notify({out_trade_no:order.id})).body,'success')
 const first = (await db.query('SELECT expires_at FROM memberships')).rows[0].expires_at
 assert.equal((await notify({out_trade_no:order.id})).body,'success')
 assert.equal((await db.query('SELECT expires_at FROM memberships')).rows[0].expires_at.toISOString(),first.toISOString())
 const second=(await buy()).json()
 assert.equal((await notify({out_trade_no:second.id,trade_no:'2026102900000002'})).body,'success')
 assert.ok((await db.query('SELECT expires_at FROM memberships')).rows[0].expires_at > first)
 assert.equal((await buy('monthly_18')).statusCode,409)
 const third=(await buy()).json()
 sdk.exec = async (method, params, options) => {
   assert.equal(method,'alipay.trade.query'); assert.equal(options.validateSign,true)
   assert.equal(params.bizContent.out_trade_no,third.id)
   return {code:'10000',sellerId:'seller1',outTradeNo:third.id,totalAmount:'6.00',tradeNo:'2026102900000003',tradeStatus:'TRADE_SUCCESS'}
 }
 const checked=await app.inject({url:`/api/membership/orders/${third.id}`,headers:{'x-test-user':'1'}})
 assert.equal(checked.json().status,'paid')
 const disabled=Fastify()
 await registerMembership(disabled,{pool,origin:'https://yuashie.cn',config:{},requireUser:async()=>({id:1})})
 assert.equal((await disabled.inject({url:'/api/membership/plans'})).json().ready,false)
 assert.equal((await disabled.inject({method:'POST',url:'/api/membership/orders',payload:{planId:'monthly_6'}})).statusCode,503)
 await disabled.close()
})
