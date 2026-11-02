import test from 'node:test'
import assert from 'node:assert/strict'
import {AccountCalendar} from '../public/assets/calendar/account.js'
import {selectionPayload,restoreSelection} from '../public/assets/calendar/subscription.js'
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data})
test('account client queues rapid changes, keeps the URL and carries the latest acknowledged revision',async()=>{
 let revision=1;const writes=[]
 const c=new AccountCalendar({fetcher:async(url,opts)=>{
  if(url.endsWith('/csrf'))return response({token:'csrf'})
  if(opts.method){const body=JSON.parse(opts.body);writes.push(body);assert.equal(opts.headers['X-Calendar-User'],'1');assert.equal(body.revision,revision);return response({calendar:{id:'9',revision:++revision,url:'https://yuashie.cn/fixed',selection:body.selection}})}
  return response({user:{id:'1'},calendar:{id:'9',revision,url:'https://yuashie.cn/fixed'}})
 }})
 await c.load();await Promise.all([c.save('a'),c.save('b')]);assert.deepEqual(writes.map(b=>b.revision),[1,2]);assert.equal(c.calendar.url,'https://yuashie.cn/fixed');assert.equal(c.calendar.selection,'b')
 await c.save('c',{createNew:true});assert.equal(writes[2].confirmNew,true)
})
test('account switch or stale revision pauses writes instead of silently overwriting',async()=>{
 let writes=0
 const c=new AccountCalendar({fetcher:async(url,opts)=>{
  if(url.endsWith('/csrf'))return response({token:'csrf'})
  if(opts.method){writes++;return response({message:'reload'},409)}
  return response({user:{id:'1'},calendar:{id:'9',revision:1}})
 }})
 await c.load();await assert.rejects(c.save('a'));await assert.rejects(c.save('b'));assert.equal(writes,1);assert.equal(c.paused,true)
})
test('selection reload retains games and anime and supports clearing an existing calendar',()=>{
 const chosen=new Map([['genshin',{kind:'games',types:['banner'],format:'date',duration:true}],['anime',{kind:'anime'}]]);const metadata={anime:{anilist_id:123}}
 assert.deepEqual(restoreSelection(selectionPayload(chosen,metadata).selection,metadata),chosen)
 assert.equal(restoreSelection(selectionPayload(new Map(),metadata).selection,metadata).size,0)
})
