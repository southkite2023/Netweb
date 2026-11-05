import test from 'node:test';
import assert from 'node:assert/strict';
import { orderedGames, coverageLabel } from '../public/assets/calendar/presentation.js';
import { catalog, metadata } from '../public/assets/calendar/catalog.js';
import { readFileSync } from 'node:fs';
test('complete game dates precede partial dates regardless of event volume; ties remain stable', () => {
 const games=[['empty',''],['one',''],['complete',''],['two',''],['tie','']];
 const dated={label:'已收录日期'};
 const two={date_summary:{banner:dated,version_update:dated}};
 const metadata={empty:{},one:{event_count:100,supplemental_banners:[{name:'池'}]},complete:{date_summary:{...two.date_summary,livestream:dated}},two,tie:two};
 assert.deepEqual(orderedGames(games,metadata).map(([id])=>id),['complete','two','tie','one','empty']);
 assert.equal(games[0][0],'empty');
 assert.equal(coverageLabel(metadata.complete),'前瞻 · 版本更新 · 卡池');
 assert.equal(coverageLabel(metadata.one),'卡池');
});
test('verified game categories have dated preferred-source evidence in their own server', () => {
 const {events}=JSON.parse(readFileSync('public/assets/calendar/data/events.json','utf8'));
 const registry=JSON.parse(readFileSync('public/assets/calendar/data/wiki-sources.json','utf8'));
 assert.equal(new Set(events.map(e=>e.id)).size,events.length);
 for(const g of registry.games){
  for(const [type,status] of Object.entries(g.types))if(status==='verified'){
   assert.ok(events.some(e=>e.game?.game_id===g.game_id&&e.game.server===g.server&&e.event_type===type&&e.schedule_state==='scheduled'&&e.start&&e.sources.some(s=>['community_wiki','community_timeline'].includes(s.authority))),`${g.game_id} ${type}`);
  }
  assert.deepEqual(metadata[g.game_id].coverage_types,g.types);
 }
 assert.equal(orderedGames(catalog.games,metadata).length,38);
});

test('every game type has an explicit review reason and never treats a failed search as an official non-announcement',async()=>{
 const {dateReviews,dateReview}=await import('../public/assets/calendar/date-status.js');
 for(const [id] of catalog.games)for(const type of ['livestream','version_update','banner']){
  const r=dateReviews[id]?.[type];assert.ok(r?.reason&&r?.label&&r?.checked_on,`${id}/${type}`);assert.ok(r.sources.length);
  if(r.status==='not_announced')assert.ok(r.official_evidence?.url&&r.official_evidence?.scope,'Official non-announcement requires scoped official evidence');
 }
 assert.equal(dateReview('reverse1999','banner').status,'source_uncertain');
 assert.equal(dateReview('bluearchive','banner').status,'conflict');
 assert.equal(dateReview('infinitynikki','banner').status,'unread_image');
 assert.equal(dateReview('zzz','version_update').status,'recorded');
 assert.equal(dateReview('unknown','banner').status,'not_checked');
});


test('source-listed dates remain visible and count toward display coverage without becoming verified',()=>{
 const m={coverage_types:{banner:'pending',livestream:'verified',version_update:'pending'},source_records:{banner:[{start:'2026-11-01'}],version_update:[{start:'2026-11-02'}]}};
 assert.equal(coverageLabel(m),'版本更新 · 卡池');
 assert.deepEqual(orderedGames([['empty',''],['listed','']],{empty:{},listed:m}).map(([id])=>id),['listed','empty']);
 for(const [id] of catalog.games){const meta=metadata[id];if(meta.source_records)for(const records of Object.values(meta.source_records))for(const row of records)assert.ok(row.name&&row.url&&row.start,id);}
});


test('GameG focus covers all fifteen CN games and keeps old international selections distinct',()=>{
 assert.equal(new Set(catalog.focus_games).size,15);
 const registry=JSON.parse(readFileSync('public/assets/calendar/data/wiki-sources.json'));
 const subscriptions=JSON.parse(readFileSync('public/assets/calendar/data/subscriptions.json'));
 for(const id of catalog.focus_games){const g=registry.games.find(g=>g.game_id===id);assert.equal(g.server,'cn');assert.equal(g.timeline_source.provider,'gameg');assert.ok(subscriptions.games.includes(id));for(const type of ['banner','livestream','version_update'])assert.ok(g.source_reviews[type]?.reason);}
 assert.ok(catalog.focus_games.includes('duetnightabyss-cn'));
 assert.ok(!catalog.focus_games.includes('duetnightabyss'));
 assert.equal(metadata.duetnightabyss.server,'global');
});
