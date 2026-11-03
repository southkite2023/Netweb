import test from 'node:test';
import assert from 'node:assert/strict';
import { orderedGames, coverageLabel } from '../public/assets/calendar/presentation.js';
import { catalog, metadata } from '../public/assets/calendar/catalog.js';
import { readFileSync } from 'node:fs';
test('complete game dates precede partial dates regardless of event volume; ties remain stable', () => {
 const games=[['empty',''],['one',''],['complete',''],['two',''],['tie','']];
 const metadata={empty:{event_count:0},one:{event_count:100,coverage_types:{banner:'verified'}},complete:{event_count:1,coverage_types:{banner:'verified',livestream:'verified',version_update:'verified'}},two:{coverage_types:{banner:'verified',version_update:'verified'}},tie:{coverage_types:{banner:'verified',version_update:'verified'}}};
 assert.deepEqual(orderedGames(games,metadata).map(([id])=>id),['complete','two','tie','one','empty']);
 assert.equal(games[0][0],'empty');
 assert.equal(coverageLabel(metadata.complete),'三类日期已收录');
 assert.match(coverageLabel(metadata.one),/1\/3/);
});
test('verified game categories have dated Wiki evidence in their own server', () => {
 const {events}=JSON.parse(readFileSync('public/assets/calendar/data/events.json','utf8'));
 const registry=JSON.parse(readFileSync('public/assets/calendar/data/wiki-sources.json','utf8'));
 assert.equal(new Set(events.map(e=>e.id)).size,events.length);
 for(const g of registry.games){
  for(const [type,status] of Object.entries(g.types))if(status==='verified'){
   assert.ok(events.some(e=>e.game?.game_id===g.game_id&&e.game.server===g.server&&e.event_type===type&&e.schedule_state==='scheduled'&&e.start&&e.sources.some(s=>s.authority==='community_wiki')),`${g.game_id} ${type}`);
  }
  assert.deepEqual(metadata[g.game_id].coverage_types,g.types);
 }
 assert.equal(orderedGames(catalog.games,metadata).length,34);
});

test('every game type has an explicit review reason and never treats a failed search as an official non-announcement',async()=>{
 const {dateReviews,dateReview}=await import('../public/assets/calendar/date-status.js');
 for(const [id] of catalog.games)for(const type of ['livestream','version_update','banner']){
  const r=dateReviews[id]?.[type];assert.ok(r?.reason&&r?.label&&r?.checked_on,`${id}/${type}`);assert.ok(r.sources.length);
  if(r.status==='not_announced')assert.ok(r.official_evidence?.url&&r.official_evidence?.scope,'Official non-announcement requires scoped official evidence');
 }
 assert.equal(dateReview('reverse1999','banner').status,'read_failed');
 assert.equal(dateReview('bluearchive','banner').status,'conflict');
 assert.equal(dateReview('infinitynikki','banner').status,'unread_image');
 assert.equal(dateReview('zzz','version_update').status,'announced_unimported');
 assert.equal(dateReview('unknown','banner').status,'not_checked');
});
