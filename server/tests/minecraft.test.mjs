import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { lookupJavaProfile, registerMinecraft } from '../src/minecraft.js'
const uuid='364cfb21-c678-4af3-8547-fc97fae20cb1'
const transport=async()=>({ok:true,json:async()=>({id:uuid.replaceAll('-',''),name:'MR_SouthKite'})})
test('official lookup normalizes case and returns UUID',async()=>assert.deepEqual(await lookupJavaProfile('mr_southkite',transport),{uuid,name:'MR_SouthKite'}))
test('invalid, nonexistent and unavailable profiles fail without adding',async()=>{
 await assert.rejects(lookupJavaProfile('Steve\nstop',transport),/invalid_name/)
 await assert.rejects(lookupJavaProfile('Steve',async()=>({ok:false,status:404})),/profile_not_found/)
 await assert.rejects(lookupJavaProfile('Steve',async()=>({ok:false,status:500})),/profile_unavailable/)
 await assert.rejects(lookupJavaProfile('Steve',transport),/profile_unavailable/)
})
test('name submission synchronizes through native bridge and records result',async()=>{
 const app=Fastify();let adds=0;const row={id:1,user_id:1,minecraft_name:'MR_SouthKite',minecraft_uuid:uuid,status:'pending'}
 const pool={query:async(sql,args)=>{
  if(sql.startsWith('INSERT INTO minecraft_accounts'))return {rows:[row]}
  if(sql.startsWith('SELECT *'))return {rows:[row]}
  if(sql.startsWith('UPDATE minecraft_accounts')) { row.status=args[1];row.sync_message=args[2] }
  return {rows:[]}
 }}
 registerMinecraft(app,{pool,requireUser:async()=>({id:1}),transport,bridge:async(op,account)=>{assert.equal(op,'add');assert.equal(account.minecraft_uuid,uuid);adds++;return {ok:true,present:true}}})
 const result=await app.inject({method:'POST',url:'/api/minecraft/bind',payload:{minecraftName:'MR_SouthKite'}})
 assert.equal(result.statusCode,200);assert.equal(result.json().account.status,'active');assert.equal(adds,1)
 assert.equal((await app.inject('/api/minecraft/config')).json().mode,'java-name');await app.close()
})
test('failed official lookup never reaches whitelist bridge',async()=>{
 const app=Fastify();let calls=0
 registerMinecraft(app,{pool:{query:async()=>{throw new Error('unexpected DB write')}},requireUser:async()=>({id:1}),transport:async()=>({ok:false,status:404}),bridge:async()=>{calls++}})
 assert.equal((await app.inject({method:'POST',url:'/api/minecraft/bind',payload:{minecraftName:'Unknown'}})).statusCode,404)
 assert.equal(calls,0);assert.equal((await app.inject('/api/minecraft/bridge/pending')).statusCode,410);await app.close()
})
