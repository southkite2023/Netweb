const escapeText=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function fold(line){let out='',part='';for(const ch of line){if(new TextEncoder().encode(part+ch).length>75){out+=part+'\r\n';part=' ';}part+=ch;}return out+part;}
// Roster scope and spelling follow Hypergryph announcements /news/0787, /4916, /5101, /1455 and /1457.
const rosterNotes={
 'banner-joint-action-202611':'仅出现以下六星、五星干员：\n六星：林、赤刃明霄陈、可露希尔、焰影苇草\n五星：钼铅、佩德洛、刺玫、历阵锐枪芬、诺威尔、青枳',
 'banner-weishu-2026':'六星仅出现：Mon3tr、烛煌、真言、逻各斯、乌尔比安、引星棘刺、锏、玛恩纳、忍冬、白铁',
 'banner-zhongjian-zhenxuan-202611':'六星自选 2：老鲤、艾丽妮、凯尔希、水月、远牙、泥岩、早露、夜莺、斯卡蒂、陈、安洁莉娜、傀影\n五星自选 3：濯尘芙蓉、赤冬、绮良、羽毛笔、极光、絮雨、白面鸮、安哲拉、临光、送葬人、槐琥、真理、苇草、四月、断崖、爱丽丝、蜜蜡、石棉、乌有、熔泉、贾维、慑砂、燧石、奥斯塔',
 'banner-dingxiang-zhenxuan-3':'六星自选 3：Mon3tr、圣聆初雪、贝洛内、真言、锏、烛煌\n五星自选 3：渡桥、吉星、寻澜、明椒、响石、复奏',
 'banner-shibai-shenlan-2026-09':'概率提升：六星结城理；五星埃癸斯、岳羽由加莉',
 'banner-haiyuan-xunyou':'概率提升：六星克莱门莎；五星德·托莱多、火哨',
 'banner-jiangxuetouhuo':'概率提升：六星塔露拉、冻河；五星奥尔佳\n其余六星中权重提高：凛御银灰、新约能天使、荒芜拉普兰德',
};
function poolVariants(e){
 if(e.category!=='game'||e.event_type!=='banner')return [e];
 const raw=e.title.replace(/ · 结束提醒$/,'');
 const pair=raw.match(/ \+ 「(?:溯回忆象|流光定影)·([^」]+)」光锥/);
 let weapon=pair?[pair[1]]:null;
 if(/原神 · 7\.2 第一期/.test(raw))weapon=['秘星典谕','静水流涌之辉'];
 if(/神铸赋形/.test(raw))weapon=['神铸赋形'];
 if(/代理人[／/]音擎/.test(raw))weapon=['音擎'];
 if(weapon)return [e,{...e,id:e.id+'-weapon',weapon:true,weaponNames:weapon}];
 return /武器|光锥|音擎|弧盘研募|重构申领/.test(raw)?[{...e,weapon:true}]:[e];
}
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
    label=(event.weaponNames||bannerSubjects(game,raw)).map(name=>'「'+name+'」').join('');
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
  for(const e of expanded.flatMap(poolVariants)){const id=e.category==='game'?e.game.game_id:e.category==='anime'?e.anime.series_id:null;const config=selections.get(id);if(!config||e.schedule_state!=='scheduled'||!e.start)continue;if(e.category==='game'&&!config.types.includes(e.event_type))continue;
    if(e.weapon&&config.weapons===false)continue;
    // Anime always exports a precise airing start, without an inferred duration.
    if(e.category==='anime'&&e.time_kind!=='datetime')continue;
    const dateOnly=e.time_kind==='date'||config.format==='date';
    const boundary=s=>dateOnly?s.slice(0,10).replace(/-/g,''):utc(s);
    const summary=calendarTitle(e);
    lines.push('BEGIN:VEVENT',`UID:${e.id}@calendar.yuashie.cn`,`DTSTAMP:${utc(e.updated_at)}`,`SEQUENCE:${e.revision+(e.category==='game'?4:0)+(summary!==e.title?1:0)+(e.category==='game' && ['livestream','version_update'].includes(e.event_type) && releaseNumber(e,e.title.split(' · ').slice(1).join(' · '))?2:0)}`,`SUMMARY:${escapeText(summary)}`,`STATUS:${e.status.toUpperCase()}`,`DTSTART${dateOnly?';VALUE=DATE':''}:${boundary(e.start)}`);
    if(config.kind==='games'&&config.duration&&e.end){let end=boundary(e.end);if(dateOnly){const hasPartialDay=e.time_kind==='datetime'&&!/T00:00:00(?:[+-]|Z)/.test(e.end);if(hasPartialDay||end<=boundary(e.start)){const next=new Date((end<=boundary(e.start)?e.start:e.end).slice(0,10)+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);end=next.toISOString().slice(0,10).replace(/-/g,'');}}lines.push(`DTEND${dateOnly?';VALUE=DATE':''}:${end}`);}
    const key=e.source_key?.match(/arknights\/cn\/event\/([^:]+):/)?.[1];
    const note=rosterNotes[key]||e.calendar_note||(e.weapon?'武器池':'');
    if(note)lines.push(`DESCRIPTION:${escapeText(note)}`);
    lines.push(`URL:${e.sources?.find(s=>s.provider==='GameG引用原公告')?.url||e.url}`,'TRANSP:TRANSPARENT','END:VEVENT');count++;
  }
  lines.push('END:VCALENDAR');return {count,text:lines.map(fold).join('\r\n')+'\r\n'};
}
