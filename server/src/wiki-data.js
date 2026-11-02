import { readFile } from 'node:fs/promises'
const DATA = new URL('../../dist/assets/calendar/data/', import.meta.url)
const STATE = new URL('../../calendar-state/wiki-state.json', import.meta.url)
export async function loadWikiData() {
  const [catalog, snapshot, registry] = await Promise.all(['subscriptions.json','events.json','wiki-sources.json'].map(async name=>JSON.parse(await readFile(new URL(name,DATA),'utf8'))))
  let state
  try { state=JSON.parse(await readFile(STATE,'utf8')); if(!Array.isArray(state.events))state=null } catch { state=null }
  // A timer never modifies the deployed snapshot; a broken state falls back to that verified Wiki snapshot.
  return { catalog, events:state?.events||snapshot.events, registry, state }
}
export function wikiStatus(data, now=new Date()) {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
  return {checked_on:data.registry.checked_on, updated_at:data.state?.updated_at||null,interval_minutes:5,games:data.registry.games.map(g=>{
    const events=data.events.filter(e=>e.game?.game_id===g.game_id&&e.schedule_state==='scheduled'&&(e.end||e.start)?.slice(0,10)>=today)
    const monitor=data.state?.games?.[g.game_id]
    const stale=!data.state?.updated_at||now-new Date(data.state.updated_at)>20*60*1000
    return {...g,event_count:events.length,event_types:[...new Set(events.map(e=>e.event_type))],monitor:monitor?{...monitor,stale}:{mode:g.adapter?'auto':'watch',stale:true,message:'监测尚未运行；当前为已核验Wiki快照'}}
  })}
}
