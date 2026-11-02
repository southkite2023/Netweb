import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'
import {registerAccountCalendars} from '../src/account-calendar.js'
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url')
const selection=encode([1,[['genshin',['banner'],'exact',true]],[]])
const changed=encode([1,[['genshin',['version_update'],'date',false]],[]])
const empty=encode([1,[],[]])
const event=(type,title)=>({id:type,category:'game',game:{game_id:'genshin'},event_type:type,title,status:'confirmed',schedule_state:'scheduled',time_kind:'datetime',start:'2026-11-04T10:00:00+08:00',end:'2026-11-24T17:59:00+08:00',updated_at:'2026-11-02T00:00:00Z',revision:1,url:'https://wiki.biligame.com/ys/祈愿',sources:[]})
test('account calendar persists one default, edits same public URL, checks ownership/version and confirms new calendars',async t=>{
 const db=new PGlite(),app=Fastify();await db.exec('CREATE TABLE users(id BIGINT PRIMARY KEY); INSERT INTO users VALUES(1),(2)')
 const sql=await readFile(new URL('../sql/013_calendar_subscriptions.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql)
 const pool={query:(s,v)=>db.query(s,v),connect:async()=>({query:(s,v)=>db.query(s,v),release(){}})}
 let sourceFailed=false
 registerAccountCalendars(app,{pool,requireUser:async(req,reply)=>{const id=req.headers['x-test-user'];if(!['1','2'].includes(id)){reply.code(401).send({message:'sign in'});return null}return{id,name:'test'}},loadData:async()=>{if(sourceFailed)throw Error('unavailable');return {catalog:{games:['genshin'],anime:{}},events:[event('banner','卡池'),event('version_update','版本')]}},getAnimeCalendar:async()=>{throw Error('not used')}})
 t.after(async()=>{await app.close();await db.close()})
 const send=(method,path,payload,user='1',extra={})=>app.inject({method,url:'/api/calendar/v1/'+path,payload,headers:{'x-test-user':user,'x-calendar-user':user,...extra}})
 const path=url=>new URL(url).pathname+new URL(url).search
 assert.equal((await app.inject('/api/calendar/v1/mine')).statusCode,401)
 assert.equal((await send('GET','mine')).json().calendar,null)
 const first=await send('PUT','mine',{selection,id:null,revision:null});assert.equal(first.statusCode,200,first.body)
 let cal=first.json().calendar;const original=cal.url;assert.match(original,/account\.ics\?t=[A-Za-z0-9_-]{43}$/)
 assert.equal((await send('GET','mine')).json().calendar.url,original)
 assert.equal((await send('GET','mine',undefined,'2')).json().calendar,null)
 let feed=await app.inject(path(original));assert.equal(feed.statusCode,200);assert.match(feed.body,/卡池/);assert.match(feed.body,/DTEND:/);assert.match(feed.body,/SEQUENCE:2/)
 assert.equal((await app.inject({url:path(original),headers:{'if-none-match':feed.headers.etag}})).statusCode,304)
 const body={selection:changed,id:cal.id,revision:cal.revision}
 assert.equal((await send('PUT','mine',body,'2',{'x-calendar-user':'1'})).statusCode,409)
 assert.equal((await send('PUT','mine',body,'2')).statusCode,409)
 assert.equal((await send('PUT','mine',{...body,selection:'../bad'})).statusCode,400)
 cal=(await send('PUT','mine',body)).json().calendar;assert.equal(cal.url,original)
 const next=await app.inject(path(original));assert.match(next.body,/版本/);assert.doesNotMatch(next.body,/卡池|DTEND/);assert.match(next.body,/UID:version_update@/);assert.notEqual(next.headers.etag,feed.headers.etag)
 assert.equal((await send('PUT','mine',body)).statusCode,409) // another device's old revision
 assert.equal((await send('POST','mine/new',{selection,id:cal.id,revision:cal.revision})).statusCode,400)
 assert.equal((await send('GET','mine')).json().calendar.url,original)
 const fresh=(await send('POST','mine/new',{selection,id:cal.id,revision:cal.revision,confirmNew:true})).json().calendar
 assert.notEqual(fresh.url,original);assert.equal((await send('GET','mine')).json().calendar.url,fresh.url)
 assert.match((await app.inject(path(original))).body,/版本/);assert.match((await app.inject(path(fresh.url))).body,/卡池/)
 const cleared=(await send('PUT','mine',{selection:empty,id:fresh.id,revision:fresh.revision})).json().calendar;assert.equal(cleared.url,fresh.url)
 assert.doesNotMatch((await app.inject(path(fresh.url))).body,/BEGIN:VEVENT/)
 assert.match((await app.inject(path(original))).body,/版本/) // old calendar remains independent
 sourceFailed=true;assert.equal((await app.inject(path(original))).statusCode,503)
 assert.equal((await app.inject('/api/calendar/v1/account.ics?t=guess')).statusCode,404)
 assert.equal((await app.inject(path(original)+'&user_id=2')).statusCode,404)
})
