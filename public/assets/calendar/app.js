import { selectionPayload, restoreSelection } from './subscription.js';
import { AccountCalendar } from './account.js';
const $ = s => document.querySelector(s);
import { catalog, metadata } from './catalog.js';
import { orderedGames, coverageLabel, verifiedTypeCount } from './presentation.js';
const chosen = new Map();
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
    for(const [id,name] of (kind==='games'?orderedGames(catalog.games,metadata):catalog.anime).filter(([id,name])=>[name,metadata[id]?.original,...(metadata[id]?.aliases||[])].join(' ').toLowerCase().includes(query) && ($(`#${kind}-filter`).value==='all'||($(`#${kind}-filter`).value==='ready'?metadata[id].event_count>0:!metadata[id].event_count)))){
      const button=document.createElement('button');button.className='item';button.type='button';button.setAttribute('aria-pressed',chosen.has(id));
      const title=document.createElement('strong');title.textContent=name;
      const detail=document.createElement('small');const selection=chosen.get(id);
      detail.textContent=selection&&kind==='games'?selection.types.map(t=>types[t]).join(' / '):metadata[id].label;
      if(kind==='games'){detail.textContent=coverageLabel(metadata[id]);button.dataset.incomplete=verifiedTypeCount(metadata[id])<3;}
      button.title=[name,metadata[id].original,metadata[id].label].filter(Boolean).join(' · ');button.append(title,detail);button.disabled=!ready||account.paused;button.onclick=()=>kind==='games'?openOptions(id,name,button):(chosen.has(id)?chosen.delete(id):chosen.set(id,{kind:'anime'}),selectionChanged());list.append(button);
    }
    if(!list.children.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='没有匹配的项目';list.append(empty);}
    $(`#${kind}-count`).textContent=`${catalog[kind].length} 项 · ${catalog[kind].filter(([id])=>chosen.has(id)).length} 已选`;
  }
  $('#selected-count').textContent=`已选择 ${chosen.size} 个项目`;$('#generate').disabled=!ready||busy||account.paused||(!chosen.size&&!account.calendar);$('#generate').textContent=account.calendar?'保存到原日历':'创建我的日历';$('#new-calendar').disabled=!account.calendar||busy||account.paused;
}
function renderDates(meta){
 const list=$('#game-dates');list.replaceChildren();
 for(const type of Object.keys(types)){const row=document.createElement('li');const info=meta.date_summary?.[type];row.textContent=types[type]+'：'+(info?info.label:'尚未取得本区服可确认日期');if(info?.url){const link=document.createElement('a');link.href=info.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' 来源';row.append(link);}list.append(row);}
}
function openOptions(id,name,button){editing=id;opener=button;$('#dialog-title').textContent=name;const m=metadata[id];const pending=Object.keys(types).filter(t=>m.coverage_types?.[t]!=='verified');$('#game-coverage').textContent=m.label+'；'+(m.event_types?.length?'已收录：'+m.event_types.map(t=>types[t]).join('、')+'。':'')+(pending.length?'待核实：'+pending.map(t=>types[t]).join('、')+'，不代表没有活动。':'')+' '+(m.monitor_note||'')+' 区服：'+(m.server==='global'?'国际服':'国服')+'。';renderDates(m);$('#game-wiki').hidden=!m.url;$('#game-wiki').href=m.url||'#';$('#game-wiki').textContent='查看本游戏 Wiki 来源';$('#form-error').textContent='';const config=chosen.get(id)||{types:Object.keys(types),format:'exact',duration:false};
  document.querySelectorAll('[name=type]').forEach(x=>x.checked=config.types.includes(x.value));document.querySelectorAll('[name=format]').forEach(x=>x.checked=x.value===config.format);$('#duration').checked=config.duration;$('#remove').disabled=!chosen.has(id);$('#options').showModal();}
$('#close').onclick=()=>$('#options').close();
$('#options').addEventListener('close',()=>opener?.focus());
$('#remove').onclick=()=>{chosen.delete(editing);$('#options').close();selectionChanged();};
$('#options-form').onsubmit=e=>{e.preventDefault();const selected=[...document.querySelectorAll('[name=type]:checked')].map(x=>x.value);if(!selected.length){$('#form-error').textContent='请至少选择一种生成内容。';return;}chosen.set(editing,{kind:'games',types:selected,format:$('[name=format]:checked').value,duration:$('#duration').checked});$('#options').close();selectionChanged();};
for(const kind of ['games','anime']){$(`#${kind}-search`).oninput=draw;$(`#${kind}-filter`).onchange=draw;}
$('#generate').onclick=async()=>{
 if(!account.user){window.top.location.href='/login?redirect='+encodeURIComponent('/projects/004/select');return;}
 await persist(true);
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
 p.append(' · '+(m.verification_note||m.label)+' · 核验 '+m.checked_at+' · '+(m.event_count||0)+' 条日程');sources.append(p);
}

function renderWikiAudit(data){
 const container=$('#wiki-audit');container.replaceChildren();
 for(const g of data.games){
  const m=metadata[g.game_id];if(!m)continue;
  const monitor=g.monitor||{};m.event_count=g.event_count;m.event_types=g.event_types;m.server=g.server;m.coverage_types=g.types;
  m.label=coverageLabel(m)+(g.event_count?' · '+g.event_count+'条当前/后续日程':' · 暂无当前/后续日程');
  m.monitor_note=(monitor.mode==='auto'?'卡池自动解析；前瞻和版本待核验。':'仅监测变化，排期待人工核验。')+(monitor.error?'读取或解析失败，保留上次有效数据。':monitor.message||'')+(monitor.stale?'监测已延迟。':'');
  const p=document.createElement('p');const name=document.createElement('strong');name.textContent=g.name+'（'+(g.server==='global'?'国际服':'国服')+'）';p.append(name,' · '+m.label+'。'+m.monitor_note);
  const coverage=Object.entries(g.types).map(([t,v])=>types[t]+'：'+(v==='verified'?'已核实部分排期':v==='partial'?'部分钟点未知':'待核实')).join(' / ');p.append(document.createElement('br'),coverage+'。'+g.note);
  for(const url of g.sources){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Wiki 来源';p.append(' · ',a);}
  if(monitor.last_success_at)p.append(' · 读取成功 '+new Date(monitor.last_success_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}));
  container.append(p);
 }
 $('#wiki-updated').textContent=data.updated_at?'Wiki 检查：'+new Date(data.updated_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+'（北京时间）；每5分钟检查，日历应用按自己的频率刷新。':'当前为人工核验的Wiki快照，自动监测状态暂不可用。';draw();
}
fetch('/api/calendar/v1/games/status').then(r=>{if(!r.ok)throw Error();return r.json()}).then(renderWikiAudit).catch(()=>{$('#wiki-updated').textContent='暂时无法读取Wiki监测状态；当前显示已核验快照，不能保证即时更新。';});
