import { makeCalendar } from './calendar.mjs';
const $ = s => document.querySelector(s);
import { catalog, metadata } from './catalog.mjs';
const chosen = new Map();
let editing, opener;
const types = {livestream:'前瞻',version_update:'版本',banner:'卡池'};
function draw(){
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
function openOptions(id,name,button){editing=id;opener=button;$('#dialog-title').textContent=name;$('#game-coverage').textContent=metadata[id].event_count?metadata[id].label+'；仅导出已收录的事件类型。':metadata[id].label+'；可保存选择，暂无可导出事件。';$('#form-error').textContent='';const config=chosen.get(id)||{types:Object.keys(types),format:'exact',duration:false};
  document.querySelectorAll('[name=type]').forEach(x=>x.checked=config.types.includes(x.value));document.querySelectorAll('[name=format]').forEach(x=>x.checked=x.value===config.format);$('#duration').checked=config.duration;$('#remove').disabled=!chosen.has(id);$('#options').showModal();}
$('#close').onclick=()=>$('#options').close();
$('#options').addEventListener('close',()=>opener?.focus());
$('#remove').onclick=()=>{chosen.delete(editing);$('#options').close();draw();};
$('#options-form').onsubmit=e=>{e.preventDefault();const selected=[...document.querySelectorAll('[name=type]:checked')].map(x=>x.value);if(!selected.length){$('#form-error').textContent='请至少选择一种生成内容。';return;}chosen.set(editing,{kind:'games',types:selected,format:$('[name=format]:checked').value,duration:$('#duration').checked});$('#options').close();draw();};
for(const kind of ['games','anime']){$(`#${kind}-search`).oninput=draw;$(`#${kind}-filter`).onchange=draw;}
$('#generate').onclick=async()=>{
  const status=$('#status');const demo=$('#demo').checked;
  $('#generate').disabled=true;
  try{const response=await fetch(demo?'../data/samples/events.json':'./data/events.json');if(!response.ok)throw Error('样例加载失败');const {events}=await response.json();const result=makeCalendar(events,chosen);const missing=[...chosen].filter(([id,c])=>!events.some(e=>e.schedule_state==='scheduled'&&e.start&&(c.kind==='anime'?e.category==='anime'&&e.anime.series_id===id:e.category==='game'&&e.game.game_id===id&&c.types.includes(e.event_type)))).map(([id])=>[...catalog.games,...catalog.anime].find(x=>x[0]===id)[1]);
    if(!result.count){status.textContent='所选项目或事件类型暂无已核实排期，请查看来源或选择其他类型。';return;}
    const blob=new Blob([result.text],{type:'text/calendar;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=demo?'yuashie-fictional-sample.ics':'yuashie-calendar.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=`已生成 ${result.count} 条${demo?'虚构测试':'来源支持的'}日程。动漫仅导出经官网时段核对的下一次播出；常规周播标为暂定。${missing.length?' 未导出（所选类型暂无排期）：'+missing.join('、'):' 所选项目均有日程。'}`;
  }catch(error){status.textContent='加载失败，请通过本地服务打开页面后重试。';}finally{$('#generate').disabled=!chosen.size;}
};draw();

const sources=document.querySelector('#sources');
for(const [id,name] of [...catalog.games,...catalog.anime]){
 const m=metadata[id];const p=document.createElement('p');const a=document.createElement('a');a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=name+' · '+(m.original||m.label);p.append(a);
 if(m.official_url){const official=document.createElement('a');official.href=m.official_url;official.target='_blank';official.rel='noopener noreferrer';official.textContent=' 作品官网';p.append(' / ',official);}
 p.append(' · '+(m.verification_note||m.label)+' · 核验 '+m.checked_at+' · '+(m.event_count||0)+' 条日程');sources.append(p);
}
