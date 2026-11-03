const escapeText=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function fold(line){let out='',part='';for(const ch of line){if(new TextEncoder().encode(part+ch).length>75){out+=part+'\r\n';part=' ';}part+=ch;}return out+part;}
export function makeCalendar(events,selections){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//yuashie-calendar//Selection//ZH','CALSCALE:GREGORIAN'];let count=0;
  const endKeys=new Set(events.filter(e=>e.category==='game'&&(e.boundary==='end'||/:end$/.test(e.source_key||e.wiki_key||'')||/结束提醒$/.test(e.title))).map(e=>e.game.game_id+'|'+e.title.replace(/ · 结束提醒$/,'')+'|'+e.start));
  const expanded=[];
  for(const e of events){
    const edges=selections.get(e.game?.game_id)?.boundaries;
    if(!edges||e.category!=='game'){expanded.push(e);continue;}
    const end=e.boundary==='end'||/:end$/.test(e.source_key||e.wiki_key||'')||/结束提醒$/.test(e.title);
    if(edges==='both'||edges===(end?'end':'start'))expanded.push(e);
    if(!end&&edges!=='start'&&e.end&&!endKeys.has(e.game.game_id+'|'+e.title+'|'+e.end))expanded.push({...e,id:e.id+'-end',title:e.title+' · 结束提醒',start:e.end,end:null,time_kind:e.end.includes('T')?'datetime':'date'});
  }
  for(const e of expanded){const id=e.category==='game'?e.game.game_id:e.category==='anime'?e.anime.series_id:null;const config=selections.get(id);if(!config||e.schedule_state!=='scheduled'||!e.start)continue;if(e.category==='game'&&!config.types.includes(e.event_type))continue;
    // Anime always exports a precise airing start, without an inferred duration.
    if(e.category==='anime'&&e.time_kind!=='datetime')continue;
    const dateOnly=e.time_kind==='date'||config.format==='date';
    const boundary=s=>dateOnly?s.slice(0,10).replace(/-/g,''):utc(s);
    lines.push('BEGIN:VEVENT',`UID:${e.id}@calendar.yuashie.cn`,`DTSTAMP:${utc(e.updated_at)}`,`SEQUENCE:${e.revision}`,`SUMMARY:${escapeText(e.title)}`,`STATUS:${e.status.toUpperCase()}`,`DTSTART${dateOnly?';VALUE=DATE':''}:${boundary(e.start)}`);
    if(config.kind==='games'&&config.duration&&e.end){let end=boundary(e.end);if(dateOnly){const hasPartialDay=e.time_kind==='datetime'&&!/T00:00:00(?:[+-]|Z)/.test(e.end);if(hasPartialDay||end<=boundary(e.start)){const next=new Date((end<=boundary(e.start)?e.start:e.end).slice(0,10)+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);end=next.toISOString().slice(0,10).replace(/-/g,'');}}lines.push(`DTEND${dateOnly?';VALUE=DATE':''}:${end}`);}
    lines.push(`DESCRIPTION:${escapeText((e.description||'')+'\n原始时间：'+e.start+' → '+(e.end||'结束未知')+'\n'+e.sources.map(s=>'来源：'+s.url).join('\n'))}`,`URL:${e.url}`,'TRANSP:TRANSPARENT','END:VEVENT');count++;
  }
  lines.push('END:VCALENDAR');return {count,text:lines.map(fold).join('\r\n')+'\r\n'};
}
