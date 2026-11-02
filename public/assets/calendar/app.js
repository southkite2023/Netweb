import { subscriptionUrl } from './subscription.js';
const $ = s => document.querySelector(s);
import { catalog, metadata } from './catalog.js';
const chosen = new Map();
let editing, opener;
const types = {livestream:'前瞻',version_update:'版本',banner:'卡池'};
function draw(){
  $('#subscription-result').hidden=true;
  for(const kind of ['games','anime']){
    const query=$(`#${kind}-search`).value.trim().toLowerCase();
    const list=$(`#${kind}`);list.replaceChildren();
    for(const [id,name] of catalog[kind].filter(([id,name])=>[name,metadata[id]?.original,...(metadata[id]?.aliases||[])].join(' ').toLowerCase().includes(query) && ($(`#${kind}-filter`).value==='all'||($(`#${kind}-filter`).value==='ready'?metadata[id].event_count>0:!metadata[id].event_count)))){
      const button=document.createElement('button');button.className='item';button.type='button';button.setAttribute('aria-pressed',chosen.has(id));
      const title=document.createElement('strong');title.textContent=name;
      const detail=document.createElement('small');const selection=chosen.get(id);
      detail.textContent=selection&&kind==='games'?selection.types.map(t=>types[t]).join(' / '):metadata[id].label;
      button.title=[metadata[id].original,metadata[id].label].filter(Boolean).join(' · ');button.append(title,detail);button.onclick=()=>kind==='games'?openOptions(id,name,button):(chosen.has(id)?chosen.delete(id):chosen.set(id,{kind:'anime'}),draw());list.append(button);
    }
    if(!list.children.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='没有匹配的项目';list.append(empty);}
    $(`#${kind}-count`).textContent=`${catalog[kind].length} 项 · ${catalog[kind].filter(([id])=>chosen.has(id)).length} 已选`;
  }
  $('#selected-count').textContent=`已选择 ${chosen.size} 个项目`;$('#generate').disabled=!chosen.size;
}
function openOptions(id,name,button){editing=id;opener=button;$('#dialog-title').textContent=name;const m=metadata[id];const pending=Object.keys(types).filter(t=>!m.event_types?.includes(t));$('#game-coverage').textContent=m.label+'；'+(m.event_types?.length?'已收录：'+m.event_types.map(t=>types[t]).join('、')+'。':'')+(pending.length?'待核实：'+pending.map(t=>types[t]).join('、')+'，不代表没有活动。':'')+' '+(m.monitor_note||'')+' 区服：'+(m.server==='global'?'国际服':'国服')+'。';$('#game-wiki').hidden=!m.url;$('#game-wiki').href=m.url||'#';$('#game-wiki').textContent='查看本游戏 Wiki 来源';$('#form-error').textContent='';const config=chosen.get(id)||{types:Object.keys(types),format:'exact',duration:false};
  document.querySelectorAll('[name=type]').forEach(x=>x.checked=config.types.includes(x.value));document.querySelectorAll('[name=format]').forEach(x=>x.checked=x.value===config.format);$('#duration').checked=config.duration;$('#remove').disabled=!chosen.has(id);$('#options').showModal();}
$('#close').onclick=()=>$('#options').close();
$('#options').addEventListener('close',()=>opener?.focus());
$('#remove').onclick=()=>{chosen.delete(editing);$('#options').close();draw();};
$('#options-form').onsubmit=e=>{e.preventDefault();const selected=[...document.querySelectorAll('[name=type]:checked')].map(x=>x.value);if(!selected.length){$('#form-error').textContent='请至少选择一种生成内容。';return;}chosen.set(editing,{kind:'games',types:selected,format:$('[name=format]:checked').value,duration:$('#duration').checked});$('#options').close();draw();};
for(const kind of ['games','anime']){$(`#${kind}-search`).oninput=draw;$(`#${kind}-filter`).onchange=draw;}
$('#generate').onclick=async()=>{
 const status=$('#status');$('#generate').disabled=true;$('#subscription-result').hidden=true;
 try{
  const {url,missing}=subscriptionUrl(chosen,metadata);
  if(missing.length){status.textContent='以下动漫尚未接入自动更新源，暂不能生成订阅：'+missing.map(id=>catalog.anime.find(x=>x[0]===id)[1]).join('、')+'。请取消这些条目后生成。';return;}
  if(!url)return;
  status.textContent='正在检查订阅服务…';
  const response=await fetch(url,{headers:{Accept:'text/calendar'}});
  if(!response.ok||!(response.headers.get('content-type')||'').includes('text/calendar'))throw Error('订阅服务暂时不可用，请稍后重试；已添加的订阅链接仍保持有效。');
  if(subscriptionUrl(chosen,metadata).url!==url)return;
  const body=await response.text();if(!body.startsWith('BEGIN:VCALENDAR'))throw Error('订阅返回异常，请稍后重试。');
  $('#subscription-url').value=url;$('#subscribe-open').href=url.replace(/^https:/,'webcal:');$('#subscription-result').hidden=false;
  status.textContent='订阅链接已生成。请在日历应用中通过网址订阅，后续按客户端刷新频率更新；不要选择导入文件。动漫连接自动更新源；游戏仅采用 Wiki，已接入的卡池每 5 分钟检查，其余项目显示待核实状态。';
 }catch(error){status.textContent=error.message;}finally{$('#generate').disabled=!chosen.size;}
};
$('#copy-subscription').onclick=async()=>{try{await navigator.clipboard.writeText($('#subscription-url').value);$('#status').textContent='已复制订阅链接，请在日历应用中选择“通过网址订阅”。';}catch{$('#subscription-url').focus();$('#subscription-url').select();$('#status').textContent='请手动复制已选中的订阅链接。';}};
draw();
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
  const monitor=g.monitor||{};m.event_count=g.event_count;m.event_types=g.event_types;m.server=g.server;
  m.label=g.event_count?g.event_count+' 条Wiki日程 · 部分类型待核实':'Wiki排期待核实';
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
