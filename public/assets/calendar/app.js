import { selectionPayload, restoreSelection } from './subscription.js';
import { AccountCalendar } from './account.js';
const $ = s => document.querySelector(s);
import { catalog, metadata } from './catalog.js';
import { orderedGames, coverageLabel, availableTypeCount } from './presentation.js';
import { dateReview } from './date-status.js';
import { companies, companyOptions, matchesCompany } from './companies.js';
const chosen = new Map();
for(const kind of ['games','anime']){
 for(const [name,count] of companyOptions(kind==='games'?gameList():catalog[kind])){const option=document.createElement('option');option.value=name;option.textContent=`${name==='__unknown'?'制作公司待补充':name} · ${count}`;$(`#${kind}-filter`).append(option);}
}

function gameList(){return $('#games-scope').value==='all'?catalog.games:catalog.games.filter(([id])=>catalog.focus_games.includes(id));}
let editing, opener;
const types = {livestream:'前瞻',version_update:'版本',banner:'卡池'};
let ready=false,busy=false,saveTimer,editVersion=0,lastSaved=null;
const account=new AccountCalendar({onChange:calendar=>{
 if(!calendar)return;
 if(account.user)$('#account-state').textContent=account.user.name+' · 已沿用账号默认日历，修改后自动保存';
 $('#subscription-url').value=calendar.url;$('#subscribe-open').href=calendar.url.replace(/^https:/,'webcal:');$('#subscription-result').hidden=false;
}});
function selectionChanged(){editVersion++;draw();if(account.calendar){clearTimeout(saveTimer);$('#status').textContent='有修改，正在保存到原日历…';saveTimer=setTimeout(()=>persist(),600);}}
async function persist(explicit=false,createNew=false){
 clearTimeout(saveTimer);
 if(!account.user||account.paused)return false;
 const {selection,missing}=selectionPayload(chosen,metadata);
 if(missing.length){$('#status').textContent='这些动漫尚未接入自动源，未保存：'+missing.map(id=>catalog.anime.find(x=>x[0]===id)?.[1]||id).join('、');return false;}
 if(!createNew&&selection===lastSaved){if(explicit)$('#status').textContent='已保存到原日历，订阅链接保持不变。';return true;}
 const version=editVersion;busy=true;draw();
 try{
  await account.save(selection,{createNew});lastSaved=selection;
  $('#status').textContent=createNew?'新日历已创建，需要将新链接添加一次；旧日历仍有效。':'已保存到账号日历，原订阅链接会在日历应用下次刷新时同步。';
  if(editVersion!==version){clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),100);}
  return true;
 }catch(error){$('#status').textContent=error.message;$('#reload-calendar').hidden=!account.paused;return false;}
 finally{busy=false;draw();}
}
async function loadAccount(){
 try{
  const data=await account.load();$('#account-state').textContent=data.user.name+' · '+(data.calendar?'已沿用账号默认日历，修改后自动保存':'尚未创建账号日历');$('#sign-in-calendar').hidden=true;
  if(data.calendar){const saved=restoreSelection(data.calendar.selection,metadata);chosen.clear();for(const entry of saved)chosen.set(...entry);lastSaved=data.calendar.selection;}
 }catch(error){
  if(error.status===401){$('#account-state').textContent='登录后保存到你的固定日历，同一账号跨设备沿用。';}
  else{account.paused=true;$('#account-state').textContent='暂时无法载入账号日历，请重新载入，避免覆盖已有选择。';$('#reload-calendar').hidden=false;}
 }finally{ready=true;draw();}
}
function draw(){
  $('#subscription-result').hidden=!account.calendar;
  for(const kind of ['games','anime']){
    const query=$(`#${kind}-search`).value.trim().toLowerCase();
    const list=$(`#${kind}`);list.replaceChildren();
    for(const [id,name] of (kind==='games'?orderedGames(gameList(),metadata):catalog.anime).filter(([id,name])=>[name,metadata[id]?.original,...(metadata[id]?.aliases||[]),...(companies[id]?.names||[])].join(' ').toLowerCase().includes(query) && matchesCompany(id,$(`#${kind}-filter`).value))){
      const button=document.createElement('button');button.className='item';button.type='button';button.setAttribute('aria-pressed',chosen.has(id));
      const title=document.createElement('strong');title.textContent=name;
      const detail=document.createElement('small');const selection=chosen.get(id);
      detail.textContent=selection&&kind==='games'?selection.types.map(t=>types[t]).join(' / '):metadata[id].label;
      if(kind==='games'){detail.textContent=coverageLabel(metadata[id]);button.dataset.incomplete=availableTypeCount(metadata[id])<3;}
      button.title=[name,...(companies[id]?.names||[]),metadata[id].original,metadata[id].label].filter(Boolean).join(' · ');button.append(title,detail);button.disabled=!ready||account.paused;button.dataset.item=id;button.onclick=()=>{
        if(kind==='games'){openOptions(id,name,button);return;}
        if(chosen.has(id))chosen.delete(id);
        else chosen.set(id,{kind:'anime'});
        selectionChanged();
        list.querySelector('[data-item="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});
      };list.append(button);
    }
    if(!list.children.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='没有匹配的项目';list.append(empty);}
    const visibleItems=kind==='games'?gameList():catalog[kind];$(`#${kind}-count`).textContent=`${visibleItems.length} 项 · ${visibleItems.filter(([id])=>chosen.has(id)).length} 已选`;
  }
  document.querySelectorAll('.clear-selection').forEach(button=>button.disabled=!chosen.size||!ready||busy||account.paused);
  $('#selected-count').textContent=`已选择 ${chosen.size} 个项目`;$('#generate').disabled=!ready||busy||account.paused||(!chosen.size&&!account.calendar);$('#generate').textContent=account.calendar?'保存到原日历':'创建我的日历';$('#new-calendar').disabled=!account.calendar||busy||account.paused;
}
function dateRow(id,type,meta){
 const review=dateReview(id,type,meta),row=document.createElement('li');row.className='date-review';
 const title=document.createElement('strong');title.textContent=types[type]+'：'+review.label;row.append(title);
 const reason=document.createElement('p');reason.textContent=review.reason;row.append(reason);
 const original=meta.source_records?.[type]||[];
 const featured=type==='banner'?(meta.supplemental_banners||[]):[];
 const records=[...featured,...original.filter(row=>!featured.some(item=>item.id===row.id))];
 if(records.length){
  title.textContent=types[type]+'：来源已列出 '+records.length+' 条日期';
  const labels={confirmed:'已确认',inferred:'推算',estimated:'预计',unknown:'来源未标确认'};
  const time=value=>value?value.replace('T',' ').replace('+08:00',''):'未提供';
  const list=document.createElement('div');list.className='source-records';
  for(const [index,record] of records.entries()){
   const item=document.createElement('div');item.className='source-record';
   const name=document.createElement('strong');name.textContent=record.name;item.append(name);
   for(const boundary of ['start','end'])if(record[boundary]){const line=document.createElement('p');line.textContent=(boundary==='start'?'开始：':'结束：')+time(record[boundary])+'（北京时间） · '+(labels[record.certainty?.[boundary]]||labels.unknown);item.append(line);}
   if(record.note){const note=document.createElement('p');note.textContent=record.note;item.append(note);}
   const link=document.createElement('a');link.href=record.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=record.provider||'GameG 来源';item.append(link);
   for(const url of record.sources||[]){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='引用公告';item.append(' · ',a);}
   if(index<3||(id==='genshin'&&type==='banner'))list.append(item);else{let more=list.querySelector('details');if(!more){more=document.createElement('details');const summary=document.createElement('summary');summary.textContent='展开其余 '+(records.length-3)+' 条来源记录';more.append(summary);list.append(more);}more.append(item);}
  }
  row.append(list);
 }
 const info=meta.date_summary?.[type];
 if(info&&!records.length){const date=document.createElement('p');date.className='recorded-date';date.textContent='已收录记录：'+info.label;row.append(date);}
 if(review.status!=='recorded'){const official=document.createElement('p');official.textContent='官方公布情况：'+review.official_status;row.append(official);}
 const evidence=document.createElement('details'),summary=document.createElement('summary');summary.textContent='核查日期：'+review.checked_on+' · 查看查过的来源';evidence.append(summary);
 for(const url of [...new Set([info?.url,...review.sources].filter(Boolean))]){const line=document.createElement('p'),link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';try{link.textContent=decodeURI(url);}catch{link.textContent=url;}line.append(link);evidence.append(line);}
 row.append(evidence);return row;
}
function renderDates(id,meta){
 const list=$('#game-dates');list.replaceChildren();
 for(const type of ['banner','livestream','version_update'])list.append(dateRow(id,type,meta));
}
function openOptions(id,name,button){
 editing=id;opener=button;$('#dialog-title').textContent=name;$('#form-error').textContent='';
 const config=chosen.get(id)||{};document.querySelectorAll('[name=type]').forEach(x=>x.checked=(config.types||Object.keys(types)).includes(x.value));
 document.querySelectorAll('[name=boundary]').forEach(x=>{const saved=config.boundaries||'start';x.checked=saved==='both'||saved===x.value;});
 $('#duration').checked=!!config.duration;$('#remove').disabled=!chosen.has(id);$('#options').showModal();
}
$('#open-details').onclick=()=>{
 const m=metadata[editing];$('#detail-title').textContent=$('#dialog-title').textContent+' · 详情';
 $('#game-coverage').textContent='区服：'+(m.server==='global'?'国际服':'国服')+'。以下日期可能包含历史记录。';
 renderDates(editing,m);
 $('#game-wiki').hidden=!m.url;$('#game-wiki').href=m.url||'#';$('#game-wiki').textContent='查看主要来源';$('#item-details').showModal();
};
$('#open-tools').onclick=()=>$('#calendar-tools').showModal();
document.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('.mobile-switch button').forEach(b=>b.onclick=()=>{ $('.columns').dataset.pane=b.dataset.pane;document.querySelectorAll('.mobile-switch button').forEach(x=>x.setAttribute('aria-pressed',x===b));});
$('#close').onclick=()=>$('#options').close();
$('#options').addEventListener('close',()=>{(opener?.isConnected?opener:document.querySelector('.item[data-item="'+CSS.escape(editing)+'"]'))?.focus({preventScroll:true});});
$('#remove').onclick=()=>{chosen.delete(editing);$('#options').close();selectionChanged();};
$('#options-form').onsubmit=e=>{
 e.preventDefault();const selected=[...document.querySelectorAll('[name=type]:checked')].map(x=>x.value);if(!selected.length){$('#form-error').textContent='请至少选择一种生成内容。';return;}const edges=[...document.querySelectorAll('[name=boundary]:checked')].map(x=>x.value);if(!edges.length){$('#form-error').textContent='开始时间和结束时间至少勾选一项。';return;}chosen.set(editing,{kind:'games',types:selected,format:'exact',duration:$('#duration').checked,boundaries:edges.length===2?'both':edges[0]});
 $('#options').close();selectionChanged();
};
$('#games-scope').onchange=()=>{const filter=$('#games-filter');filter.replaceChildren();const all=document.createElement('option');all.value='all';all.textContent='全部游戏公司';filter.append(all);for(const [name,count] of companyOptions(gameList())){const option=document.createElement('option');option.value=name;option.textContent=name+' · '+count;filter.append(option);}if(auditData)renderWikiAudit(auditData);else draw();};
for(const kind of ['games','anime']){$(`#${kind}-search`).oninput=draw;$(`#${kind}-filter`).onchange=draw;}
document.querySelectorAll('.clear-selection').forEach(button=>button.onclick=()=>{chosen.clear();selectionChanged();if(!account.calendar)$('#status').textContent='已清除所有游戏与动漫选择。';});
$('#generate').onclick=async()=>{
 if(!account.user){window.top.location.href='/login?redirect='+encodeURIComponent('/projects/004/select');return;}
 if(await persist(true))$('#calendar-tools').showModal();
};
$('#new-calendar').onclick=async()=>{
 if(await persist(true))$('#new-calendar-confirm').showModal();
};
$('#cancel-new').onclick=()=>$('#new-calendar-confirm').close();
$('#confirm-new').onclick=async()=>{
 $('#new-calendar-confirm').close();await persist(true,true);
};
$('#reload-calendar').onclick=()=>location.reload();
$('#copy-subscription').onclick=async()=>{try{await navigator.clipboard.writeText($('#subscription-url').value);$('#status').textContent='已复制订阅链接，请在日历应用中选择“通过网址订阅”。';}catch{$('#subscription-url').focus();$('#subscription-url').select();$('#status').textContent='请手动复制已选中的订阅链接。';}};
draw();loadAccount();
fetch('https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/catalog/current-season.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{
 for(const [id] of catalog.anime){const m=metadata[id];if(!m.anilist_id){m.label='尚未接入自动更新源';m.event_count=0;continue;}const show=data.shows.find(s=>s.id===m.anilist_id);m.event_count=show?.next_airing_at?1:0;m.label=show?.next_airing_at?new Date(show.next_airing_at*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})+' · 自动更新源':'已接入订阅 · 暂无下一集';}
 $('#live-updated').textContent='自动更新源：'+data.updated_at+'；动漫时刻为北京时间，来源为社区排期。';draw();
}).catch(()=>{$('#live-updated').textContent='暂时无法读取自动源目录，请以生成链接时的服务检查为准。';});

const sources=document.querySelector('#sources');
for(const [id,name] of [...catalog.games,...catalog.anime]){
 const m=metadata[id];const p=document.createElement('p');const a=document.createElement(m.url?'a':'span');if(m.url)a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=name+' · '+(m.original||m.label);p.append(a);
 if(m.official_url){const official=document.createElement('a');official.href=m.official_url;official.target='_blank';official.rel='noopener noreferrer';official.textContent=' 作品官网';p.append(' / ',official);}
 const company=companies[id];if(company?.names.length){const link=document.createElement('a');link.href=company.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' · '+company.names.join(' / ');p.append(link);}
 p.append(' · '+(m.verification_note||m.label)+' · 核验 '+m.checked_at+' · '+(m.event_count||0)+' 条日程');sources.append(p);
}

let auditData;
function renderWikiAudit(data){
 auditData=data;
 const container=$('#wiki-audit');container.replaceChildren();
 for(const g of data.games){
  if($('#games-scope').value!=='all'&&!catalog.focus_games.includes(g.game_id))continue;
  const m=metadata[g.game_id];if(!m)continue;
  m.supplemental_banners=g.supplemental_banners||[];const monitor=g.monitor||{};m.event_count=g.event_count??m.event_count;m.event_types=g.event_types??m.event_types;m.server=g.server;m.coverage_types={...g.types,...monitor.source_types};m.source_records={...g.source_records,...monitor.source_records};m.source_reviews={...g.source_reviews,...monitor.source_reviews};m.date_summary={...m.date_summary,...g.date_summary,...monitor.date_summary};for(const t of monitor.covered_types||g.covered_types||[])if(m.coverage_types[t]!=='verified')delete m.date_summary[t];if(g.timeline_source)m.url=g.timeline_source.url;
  m.label=coverageLabel(m)+(m.event_count?' · '+m.event_count+'条已收录日程':' · 暂无已收录日程');
  m.monitor_note=!g.monitor?'自动监测状态尚未读取；以下是逐项核查记录。':(monitor.mode==='auto'?'日期来源自动检查。':'目前只自动监测Wiki页面变化，不自动提取新日期。')+(monitor.error?'读取或解析失败，保留上次有效数据。':monitor.message||'')+(monitor.stale?'监测已延迟。':'');
  const p=document.createElement('div');p.className='audit-game';const name=document.createElement('strong');name.textContent=g.name+'（'+(g.server==='global'?'国际服':'国服')+'）';p.append(name,' · '+m.label+'。'+m.monitor_note);
  const results=document.createElement('ul');results.className='audit-date-reviews';for(const type of Object.keys(types))results.append(dateRow(g.game_id,type,m));p.append(results);
  for(const url of [...new Set([g.timeline_source?.url,...g.sources].filter(Boolean))]){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=url.includes('gameg.site')?' GameG 主要来源':' Wiki 备选来源';p.append(' · ',a);}
  if(monitor.last_success_at)p.append(' · 读取成功 '+new Date(monitor.last_success_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}));
  container.append(p);
 }
 $('#wiki-updated').textContent=data.updated_at?'日期来源检查：'+new Date(data.updated_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+'（北京时间）；每5分钟检查，日历应用按自己的频率刷新。':'当前为已保存的来源快照，自动监测状态暂不可用。';draw();
}
fetch('data/wiki-sources.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(!$('#wiki-audit').dataset.live)renderWikiAudit(data);}).catch(()=>{$('#wiki-audit').textContent='核查目录读取失败，请点开游戏查看逐项说明。';});
fetch('/api/calendar/v1/games/status').then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{$('#wiki-audit').dataset.live='true';renderWikiAudit(data);}).catch(()=>{$('#wiki-updated').textContent='暂时无法读取来源监测状态；当前显示已核验快照，不能保证即时更新。';});
