import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {catalog,metadata} from '../public/assets/calendar/catalog.js';
import {makeCalendar} from '../public/assets/calendar/calendar.js';
test('calendar browser imports use JavaScript extensions served by production nginx',()=>{
 const app=readFileSync('public/assets/calendar/app.js','utf8');
 for(const [,path] of app.matchAll(/from ['"](.+?)['"]/g)){assert.ok(path.endsWith('.js'));assert.ok(existsSync('public/assets/calendar/'+path));}
});
test('all 85 anime have sourced titles or explicit original fallback and export retains selection',()=>{
 assert.equal(catalog.anime.length,85);
 const registry=JSON.parse(readFileSync('public/assets/calendar/data/anime-titles.json','utf8'));
 const map=new Map(registry.entries.map(e=>[e.id,e]));
 assert.equal(map.size,85);
 const subscriptions=JSON.parse(readFileSync('public/assets/calendar/data/subscriptions.json','utf8'));
 for(const [id,name] of catalog.anime){const e=map.get(id);assert.equal(name,e.title);assert.equal(e.native_title,metadata[id].original);if(e.source_kind==='original')assert.equal(name,e.native_title);else assert.match(e.source_url,/^https:\/\//);assert.doesNotMatch(name,/外汇战士|她的朋友/);if(e.anilist_id)assert.equal(subscriptions.anime[e.anilist_id],name);}
 assert.equal(catalog.anime.find(([id])=>id==='official:fxkurumi')[1],'FX战士久留美');
 assert.equal(registry.entries.find(e=>e.anilist_id===211877).title,'女友的朋友');
 const {events}=JSON.parse(readFileSync('public/assets/calendar/data/events.json','utf8'));
 assert.ok(makeCalendar(events,new Map(catalog.anime.map(([id])=>[id,{kind:'anime'}]))).count>0);
});
