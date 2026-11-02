import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {catalog} from '../public/assets/calendar/catalog.js';
import {makeCalendar} from '../public/assets/calendar/calendar.js';
test('calendar browser imports use JavaScript extensions served by production nginx',()=>{
 const app=readFileSync('public/assets/calendar/app.js','utf8');
 for(const [,path] of app.matchAll(/from ['"](.+?)['"]/g)){assert.ok(path.endsWith('.js'));assert.ok(existsSync('public/assets/calendar/'+path));}
});
test('all 85 anime display titles are Chinese and export retains selection',()=>{
 assert.equal(catalog.anime.length,85);
 for(const [,name] of catalog.anime)assert.doesNotMatch(name,/[ぁ-ヿA-Za-z]/);
 const {events}=JSON.parse(readFileSync('public/assets/calendar/data/events.json','utf8'));
 assert.ok(makeCalendar(events,new Map(catalog.anime.map(([id])=>[id,{kind:'anime'}]))).count>0);
});
