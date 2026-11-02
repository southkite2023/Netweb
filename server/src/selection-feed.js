import { createHash } from 'node:crypto'
import { loadWikiData, wikiStatus } from './wiki-data.js'
import { makeCalendar } from './selection-calendar.js'
export function parseSubscription(raw, catalog) {
  try {
    if(typeof raw!=='string'||raw.length>16000||!/^[A-Za-z0-9_-]+$/.test(raw))return null
    const payload=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));if(!Array.isArray(payload)||payload.length!==3)return null
    const [v,games,anime]=payload
    if(v!==1||!Array.isArray(games)||games.length>40||!Array.isArray(anime)||anime.length>85||!games.length&&!anime.length)return null
    const selected=new Map()
    for(const row of games){
      if(!Array.isArray(row)||row.length!==4)return null
      const [id,types,format,duration]=row
      if(!catalog.games.includes(id)||selected.has(id)||!Array.isArray(types)||!types.length||types.length>3||types.some(t=>!['livestream','version_update','banner'].includes(t))||!['date','exact'].includes(format)||typeof duration!=='boolean')return null
      selected.set(id,{kind:'games',types,format,duration})
    }
    if(anime.some(id=>!Number.isSafeInteger(id)||!Object.hasOwn(catalog.anime,String(id)))||new Set(anime).size!==anime.length)return null
    return {games:selected,anime}
  }catch{return null}
}
function fold(line){let out='',part='';for(const c of line){if(Buffer.byteLength(part+c)>75){out+=part+'\r\n';part=' '}part+=c}return out+part}
export function selectedAnimeEvents(source, ids, titles) {
  const lines=source.replace(/\r\n[ \t]/g,'').split(/\r?\n/)
  const targets=new Set(ids);const events=[];let event=null
  for(const line of lines){
    if(line==='BEGIN:VEVENT')event=[]
    if(event)event.push(line)
    if(line==='END:VEVENT'&&event){
      const id=Number(event.find(l=>l.startsWith('URL:https://anilist.co/anime/'))?.split('/').at(-1))
      if(targets.has(id)){
        const title=titles[id].replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/[\r\n]/g,'')
        events.push(event.filter(l=>!l.startsWith('DTEND')).map(l=>l.startsWith('SUMMARY:')?'SUMMARY:'+title+(l.match(/ · 第.*$/)?.[0]||' · 播出'):l).map(fold).join('\r\n'))
      }
      event=null
    }
  }
  return events
}
export function registerSelectionFeed(app,{getAnimeCalendar,loadData=loadWikiData}){
 app.get('/api/calendar/v1/games/status',async(req,reply)=>{
  try {const data=await loadData();return reply.header('Cache-Control','no-cache').send(wikiStatus(data))}
  catch {return reply.code(503).send({message:'Wiki status temporarily unavailable'})}
 })
 app.get('/api/calendar/v1/selection.ics',{config:{rateLimit:{max:30,timeWindow:'1 minute'}}},async(req,reply)=>{
  let data;try{data=await loadData()}catch{return reply.code(503).header('Retry-After','300').send({message:'Subscription data temporarily unavailable'})}
  if(Object.keys(req.query).some(k=>k!=='s'))return reply.code(400).send({message:'Invalid subscription'})
  const selection=parseSubscription(req.query.s,data.catalog)
  if(!selection)return reply.code(400).send({message:'Invalid subscription'})
  const game=makeCalendar(data.events,selection.games).text
  const end='END:VCALENDAR\r\n';let output=game.slice(0,-end.length)
  let stale=false
  if(selection.anime.length){
    try{const source=await getAnimeCalendar();stale=source.stale;output+=selectedAnimeEvents(source.content,selection.anime,data.catalog.anime).join('\r\n')+'\r\n'}catch{return reply.code(503).header('Retry-After','300').send({message:'Live anime source unavailable; retain existing calendar'})}
  }
  output+=end
  const etag='"'+createHash('sha256').update(output).digest('hex')+'"'
  reply.header('Content-Type','text/calendar; charset=utf-8').header('Cache-Control',stale?'public, max-age=0, must-revalidate':'public, max-age=120, must-revalidate').header('ETag',etag).header('X-Content-Type-Options','nosniff')
  if(req.headers['if-none-match']===etag)return reply.code(304).send()
  return reply.send(output)
 })
}
