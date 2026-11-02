import test from 'node:test'
import assert from 'node:assert/strict'
import {wikiStatus} from '../src/wiki-data.js'
import {readFile} from 'node:fs/promises'
test('Wiki registry audits all 34 games; exported game events contain only Wiki evidence',async()=>{
 const base=new URL('../../public/assets/calendar/data/',import.meta.url)
 const registry=JSON.parse(await readFile(new URL('wiki-sources.json',base),'utf8'))
 const events=JSON.parse(await readFile(new URL('events.json',base),'utf8')).events
 assert.equal(registry.games.length,34);assert.equal(new Set(registry.games.map(g=>g.game_id)).size,34)
 for(const game of registry.games){assert.deepEqual(Object.keys(game.types).sort(),['banner','livestream','version_update']);assert.ok(game.note);assert.ok(game.sources.every(u=>registry.allowed_hosts.includes(new URL(u).hostname)))}
 for(const e of events.filter(e=>e.category==='game')){assert.ok(e.sources.length);assert.ok(e.sources.every(s=>s.provider==='wiki'&&registry.allowed_hosts.includes(new URL(s.url).hostname)));if(e.time_kind==='date')assert.ok(!e.end||!e.end.includes('T'))}
})
test('status exposes delayed monitor and missing types without claiming no events',()=>{
 const data={registry:{checked_on:'2026-11-02',games:[{game_id:'a',types:{livestream:'pending'},sources:[]}]},events:[],state:{updated_at:'2026-11-02T00:00:00Z',games:{a:{mode:'watch',error:'403'}}}}
 const status=wikiStatus(data,new Date('2026-11-02T01:00:00Z'));assert.equal(status.games[0].monitor.stale,true);assert.equal(status.games[0].types.livestream,'pending');assert.equal(status.games[0].event_count,0);assert.equal(status.games[0].monitor.error,'403')
})
