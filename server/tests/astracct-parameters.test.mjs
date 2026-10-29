import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { registerAstracctParameters, encryptParameters, decryptParameters, validParameters } from '../src/astracct-parameters.js'
const p = {id:'work',provider:'deepseek',category:'ai',name:'work',key:'test-secret',accessKeyId:'',endpoint:'',balancePath:'data.balance',currency:'USD'}
test('encrypted parameters reject tampering and binding to another user or record',()=>{
 const key=Buffer.alloc(32,7), value=encryptParameters(p,1,key)
 assert.ok(!value.includes(p.key)); assert.deepEqual(decryptParameters(value,1,p.id,key),p)
 assert.throws(()=>decryptParameters(value,2,p.id,key)); assert.throws(()=>decryptParameters(value,1,'other',key))
 assert.equal(validParameters({...p,user_id:2}),false)
 assert.equal(validParameters({...p,key:'x'.repeat(4097)}),false)
})
test('real database upsert, account isolation, authentication, limits and deletion',async t=>{
 const db=new PGlite(), app=Fastify()
 await db.exec('CREATE TABLE users(id BIGINT PRIMARY KEY); INSERT INTO users VALUES(1),(2)')
 const sql=await readFile(new URL('../sql/010_astracct_parameters.sql',import.meta.url),'utf8')
 await db.exec(sql); await db.exec(sql)
 process.env.ASTRACCT_PARAMETERS_KEY='07'.repeat(32)
 registerAstracctParameters(app,db,async(req,reply)=>{ const id=req.headers['x-test-user']; if(!['1','2'].includes(id)){reply.code(401).send({});return null} return {id:Number(id)} })
 t.after(async()=>{await app.close();await db.close()})
 const send=(method,payload,user='1',url='/api/astracct/parameters')=>app.inject({method,url,payload,headers:{'x-test-user':user}})
 assert.equal((await send('POST',{version:1,parameters:p},'')).statusCode,401)
 assert.equal((await send('POST',{version:1,parameters:{...p,user_id:2}})).statusCode,400)
 assert.equal((await send('POST',{version:1,parameters:p})).statusCode,200)
 const raw=(await db.query('SELECT payload FROM astracct_parameters')).rows[0].payload
 assert.ok(!raw.includes('test-secret'))
 const result=await send('GET'); assert.equal(result.headers['cache-control'],'no-store'); assert.deepEqual(result.json().accounts[0].parameters,p)
 assert.deepEqual((await send('GET',undefined,'2')).json().accounts,[])
 await send('DELETE',undefined,'2','/api/astracct/parameters/work')
 assert.equal((await send('GET')).json().accounts.length,1)
 await send('POST',{version:1,parameters:{...p,name:'updated'}})
 assert.equal((await send('GET')).json().accounts.length,1)
 assert.equal((await send('GET')).json().accounts[0].parameters.name,'updated')
 await send('DELETE',undefined,'1','/api/astracct/parameters/work')
 assert.deepEqual((await send('GET')).json().accounts,[])
 delete process.env.ASTRACCT_PARAMETERS_KEY
 assert.equal((await send('POST',{version:1,parameters:p})).statusCode,503)
})
