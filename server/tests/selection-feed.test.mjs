import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import {registerSelectionFeed,parseSubscription} from '../src/selection-feed.js'
import {subscriptionUrl} from '../../public/assets/calendar/subscription.js'
const catalog={games:['genshin'],anime:{'206401':'学生会也有洞！'}}
const selection=new Map([['genshin',{kind:'games',types:['version_update'],format:'date',duration:false}],['show',{kind:'anime'}]])
const metadata={show:{anilist_id:206401}}
const url=subscriptionUrl(selection,metadata).url
const payload=new URL(url).searchParams.get('s')
const makeGame=start=>({id:'11111111-2222-4333-8444-555555555555',category:'game',game:{game_id:'genshin'},event_type:'version_update',title:'原神更新',status:'confirmed',schedule_state:'scheduled',time_kind:'date',start,end:null,updated_at:'2026-11-02T00:00:00Z',revision:1,url:'https://example.com',sources:[{url:'https://example.com'}]})
const anime=(episode,date)=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:stable-anime\r\nSEQUENCE:${episode}\r\nURL:https://anilist.co/anime/206401\r\nSUMMARY:Original · 第 ${episode} 集\r\nDTSTART:${date}\r\nDTEND:20261101T120000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`
test('subscription URLs are deterministic, round trip both categories, reject unmapped shows',()=>{
 assert.equal(subscriptionUrl(new Map([...selection].reverse()),metadata).url,url)
 const parsed=parseSubscription(payload,catalog);assert.deepEqual(parsed.anime,[206401]);assert.ok(parsed.games.has('genshin'))
 assert.equal(parseSubscription(Buffer.from(JSON.stringify([1,[],[999]])).toString('base64url'),catalog),null)
 assert.equal(parseSubscription('../file',catalog),null)
 assert.equal(subscriptionUrl(new Map([['unknown',{kind:'anime'}]]),metadata).url,null)
})
test('same URL gets later anime episodes and game data, with stable UIDs and fresh ETags',async()=>{
 const app=Fastify();let ep=5,start='2026-11-04',fail=false
 registerSelectionFeed(app,{loadData:async()=>({catalog,events:[makeGame(start)]}),getAnimeCalendar:async()=>{if(fail)throw Error('upstream');return {content:anime(ep,'20261107T153000Z'),stale:false}}})
 const path=new URL(url).pathname+new URL(url).search
 const first=await app.inject(path);assert.equal(first.statusCode,200);assert.match(first.body,/学生会也有洞！ · 第 5 集/);assert.match(first.body,/DTSTART;VALUE=DATE:20261104/);assert.doesNotMatch(first.body,/DTEND/)
 const unchanged=await app.inject({url:path,headers:{'if-none-match':first.headers.etag}});assert.equal(unchanged.statusCode,304)
 ep=6;start='2026-11-11'
 const next=await app.inject(path);assert.notEqual(next.headers.etag,first.headers.etag);assert.match(next.body,/第 6 集/);assert.match(next.body,/DTSTART;VALUE=DATE:20261111/);assert.match(next.body,/UID:stable-anime/)
 fail=true;assert.equal((await app.inject(path)).statusCode,503)
 assert.equal((await app.inject(path+'&url=https://evil.example')).statusCode,400)
 await app.close()
})
