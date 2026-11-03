const escapeText=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function fold(line){let out='',part='';for(const ch of line){if(new TextEncoder().encode(part+ch).length>75){out+=part+'\r\n';part=' ';}part+=ch;}return out+part;}
// Source titles stay in the description. SUMMARY is the short title shown in calendars.
function bannerSubjects(game, raw) {
  if (game === '原神') {
    if (/7\.1 第一期活动祈愿/.test(raw)) return ['薇斯纳','沃雅妮莎'];
    if (/7\.2 第一期/.test(raw)) return ['米提亚','芙宁娜'];
    if (/7\.1版本活动祈愿预告第二期/.test(raw)) return ['丝柯克','爱可菲'];
  }
  if (game === '绝区零' && raw.startsWith('3.3上期限时频段')) return ['菲欧妮','维琳娜'];
  let names;
  if (game === '无期迷途') names = raw.split('-').at(-1);
  if (game === '明日方舟：终末地') names = raw.match(/（([^（）]+)）$/)?.[1];
  if (game === '恋与深空') names = raw.match(/「([^·」]+)·/)?.[1];
  if (game === '光与夜之恋') names = raw.match(/（([^・）]+)・/)?.[1];
  if (game === '异环') names = raw.match(/(?:限定棋盘|弧盘研募)·(.+?)(?:返场)?（/)?.[1];
  if (game === '崩坏：星穹铁道') names = raw.match(/」([^「」 +]+?)(?:复刻)? \+/)?.[1];
  names ||= raw.match(/(?:★\d+\(SSR\))(.+?)推荐召唤/)?.[1];
  names ||= raw.match(/^(.+?)(?: Pick Up|限时研发|联动研发|限时招募)$/i)?.[1];
  names ||= raw.match(/第[一二]期 · (.+)$/)?.[1];
  if (names) return names.split(/[、／/＋+]/).map(n=>n.trim()).filter(Boolean);
  const pool = raw.match(/【([^】]+)】/)?.[1] || raw.match(/「([^」]+)」/)?.[1];
  return [pool || raw];
}

function versionSubject(raw,game) {
  if(game==='绝区零' && /^3\.3版本/.test(raw)) return '重返天空的旅程';
  const named = raw.match(/「([^」]+)」/)?.[1];
  if (named) return named;
  const maintenanceName = raw.match(/维护（([^）]+)）$/)?.[1];
  if (maintenanceName && !/临时|扩容/.test(maintenanceName)) return maintenanceName;
  const version = raw.match(/(\d+\.\d+(?:\.\d+)?|S\d+)\s*(?:赛季)?版本/);
  if (version) return version[1];
  return raw.replace(/^\[[^\]]+\]/,'').replace(/^\d+\.\d+\s+/,'')
    .replace(/(?:版本)?(?:更新停机维护|更新维护|版本维护|闪断更新|不停服更新|不停服维护|版本更新|前瞻特别节目|特别直播|停服维护|更新)(?:公告|预告)?$/,'').trim() || raw;
}

function releaseNumber(event, raw) {
  const number = /^(?:\d+\.\d+(?:\.\d+)?|S\d+)$/i;
  for (const value of [event.game?.version, event.version]) {
    if (typeof value === 'string' && number.test(value.trim())) return value.trim().toUpperCase();
  }
  const explicit = raw.match(/(\d+\.\d+(?:\.\d+)?)\s*(?:版本|版|「)/)
    || raw.match(/^(\d{1,2}\.\d+(?:\.\d+)?)\s+(?=[^\d])/)
    || raw.match(/(S\d+)(?![a-z\d])/i);
  if (explicit) return explicit[1].toUpperCase();
  const source = event.source_key?.match(/\/version\/(\d+\.\d+(?:\.\d+)?|s\d+):(?:start|end)$/i);
  return source?.[1].toUpperCase() || '';
}

function calendarTitle(event) {
  if (event.category !== 'game') return event.title;
  const [game,...parts] = event.title.split(' · ');
  if (!parts.length) return event.title;
  const ending = parts.at(-1)==='结束提醒' || event.boundary==='end' || /:end$/.test(event.source_key||event.wiki_key||'');
  if (parts.at(-1)==='结束提醒') parts.pop();
  const raw = parts.join(' · ');
  const action = {banner:'入池',livestream:'前瞻',version_update:'更新'}[event.event_type];
  if (!action) return event.title;
  let label;
  if (event.event_type==='banner') {
    label=bannerSubjects(game,raw).map(name=>'「'+name+'」').join('');
  } else {
    let name=versionSubject(raw,game);
    const version=releaseNumber(event,raw);
    if (version) {
      if (name.startsWith(version)) name=name.slice(version.length).replace(/^(?:赛季|版本)?\s*/,'');
      label='「'+[version,name].filter(Boolean).join(' ')+'」';
    } else {
      label='「'+name+'」';
    }
  }
  return game+' · '+label+action+(ending?' · 结束提醒':'');
}

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
    const summary=calendarTitle(e);
    lines.push('BEGIN:VEVENT',`UID:${e.id}@calendar.yuashie.cn`,`DTSTAMP:${utc(e.updated_at)}`,`SEQUENCE:${e.revision+(summary!==e.title?1:0)+(e.category==='game' && ['livestream','version_update'].includes(e.event_type) && releaseNumber(e,e.title.split(' · ').slice(1).join(' · '))?2:0)}`,`SUMMARY:${escapeText(summary)}`,`STATUS:${e.status.toUpperCase()}`,`DTSTART${dateOnly?';VALUE=DATE':''}:${boundary(e.start)}`);
    if(config.kind==='games'&&config.duration&&e.end){let end=boundary(e.end);if(dateOnly){const hasPartialDay=e.time_kind==='datetime'&&!/T00:00:00(?:[+-]|Z)/.test(e.end);if(hasPartialDay||end<=boundary(e.start)){const next=new Date((end<=boundary(e.start)?e.start:e.end).slice(0,10)+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);end=next.toISOString().slice(0,10).replace(/-/g,'');}}lines.push(`DTEND${dateOnly?';VALUE=DATE':''}:${end}`);}
    lines.push(`DESCRIPTION:${escapeText((summary!==e.title?'原始标题：'+e.title+'\n':'')+(e.description||'')+'\n原始时间：'+e.start+' → '+(e.end||'结束未知')+'\n'+e.sources.map(s=>'来源：'+s.url).join('\n'))}`,`URL:${e.url}`,'TRANSP:TRANSPARENT','END:VEVENT');count++;
  }
  lines.push('END:VCALENDAR');return {count,text:lines.map(fold).join('\r\n')+'\r\n'};
}
