import test from 'node:test';
import assert from 'node:assert/strict';
import { gamesForRegion, regionForLanguage, followSiteLanguage } from '../public/assets/calendar/regions.js';
import { catalog, metadata } from '../public/assets/calendar/catalog.js';
import { selectionPayload, restoreSelection } from '../public/assets/calendar/subscription.js';

test('main-site locales select the corresponding real server, including language tags',()=>{
 for(const lang of ['en','en-US','en_GB'])assert.equal(regionForLanguage(lang),'global');
 for(const lang of ['ja','ja-JP'])assert.equal(regionForLanguage(lang),'jp');
 for(const lang of ['zh','zh-CN','zh-TW',null])assert.equal(regionForLanguage(lang),'cn');
});
test('server filtering respects CN focus, exposes international records and never relabels them as Japanese',()=>{
 const cn=gamesForRegion(catalog.games,metadata,'cn','gameg',catalog.focus_games);
 assert.equal(cn.length,15);
 assert.ok(cn.every(([id])=>metadata[id].server==='cn'));
 const global=gamesForRegion(catalog.games,metadata,'global','gameg',catalog.focus_games);
 assert.ok(global.length>0);assert.ok(global.some(([id])=>id==='duetnightabyss'));
 assert.ok(!global.some(([id])=>id==='duetnightabyss-cn'));
 assert.deepEqual(gamesForRegion(catalog.games,metadata,'jp'),[]);
 const fixture=[['cn',''],['global',''],['jp',''],['unknown','']];
 assert.deepEqual(gamesForRegion(fixture,{cn:{server:'cn'},global:{server:'global'},jp:{server:'jp'}},'jp'),[['jp','']]);
});
test('switching visible server preserves both regional subscription IDs and saved reminders',()=>{
 const chosen=new Map([['duetnightabyss-cn',{kind:'games',types:['banner'],format:'exact',duration:false,boundaries:'start'}],['duetnightabyss',{kind:'games',types:['version_update'],format:'exact',duration:false,boundaries:'end'}]]);
 const before=selectionPayload(chosen,metadata).selection;
 for(const region of ['cn','global','jp'])gamesForRegion(catalog.games,metadata,region);
 assert.equal(selectionPayload(chosen,metadata).selection,before);
 assert.deepEqual(restoreSelection(before,metadata),chosen);
});
test('embedded language updates override a manual region only when the parent language changes',()=>{
 const root={lang:'zh-CN'},listeners=new Map();let mutate,disconnected=false;
 const win={parent:{document:{documentElement:root}},MutationObserver:class{constructor(fn){mutate=fn}observe(target,options){assert.equal(target,root);assert.deepEqual(options.attributeFilter,['lang'])}disconnect(){disconnected=true}},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 let selected;const calls=[];const stop=followSiteLanguage(win,region=>{selected=region;calls.push(region)});
 assert.equal(selected,'cn');selected='jp';mutate();assert.equal(selected,'jp');
 root.lang='en';mutate();assert.equal(selected,'global');
 root.lang='ja-JP';mutate();assert.equal(selected,'jp');
 root.lang='zh-CN';mutate();assert.equal(selected,'cn');
 assert.deepEqual(calls,['cn','global','jp','cn']);stop();assert.ok(disconnected);assert.equal(listeners.size,0);
});
test('standalone uses saved site language, tolerates blocked storage and reacts to language storage events',()=>{
 let stored='en',selected;const listeners=new Map();const win={document:{documentElement:{lang:'zh-CN'}},localStorage:{getItem:()=>stored},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};win.parent=win;
 followSiteLanguage(win,region=>selected=region);assert.equal(selected,'global');
 stored='ja';listeners.get('storage')({key:'preferred-language'});assert.equal(selected,'jp');
 win.localStorage.getItem=()=>{throw Error('denied')};listeners.get('storage')({key:null});assert.equal(selected,'cn');
});
