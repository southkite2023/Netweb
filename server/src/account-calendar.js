import {randomBytes,createHash} from 'node:crypto'
import {parseSubscription,renderSelection} from './selection-feed.js'
import {loadWikiData} from './wiki-data.js'

export function registerAccountCalendars(app,{pool,requireUser,getAnimeCalendar,loadData=loadWikiData,origin='https://yuashie.cn'}){
 const present=row=>row?{id:String(row.id),revision:row.revision,selection:row.selection,url:origin+'/api/calendar/v1/account.ics?t='+row.token}:null
 async function owner(req,reply){
  reply.header('Cache-Control','no-store')
  const user=await requireUser(req,reply);if(!user)return null
  if(!['GET','HEAD'].includes(req.method)&&req.headers['x-calendar-user']!==String(user.id)){reply.code(409).send({message:'账号已变化，请重新载入日历。'});return null}
  return user
 }
 app.get('/api/calendar/v1/mine',async(req,reply)=>{
  const user=await owner(req,reply);if(!user)return
  const {rows}=await pool.query('SELECT * FROM calendar_subscriptions WHERE user_id=$1 AND is_default',[user.id])
  return {user:{id:String(user.id),name:user.display_name||user.username||'当前账号'},calendar:present(rows[0])}
 })
 async function save(req,reply,newCalendar){
  const user=await owner(req,reply);if(!user)return
  const body=req.body
  if(!body||Object.keys(body).some(k=>!['selection','id','revision','confirmNew'].includes(k))||typeof body.selection!=='string')return reply.code(400).send({message:'日历设置无效。'})
  if(newCalendar&&body.confirmNew!==true)return reply.code(400).send({message:'创建新日历前必须再次确认。'})
  let data;try{data=await loadData()}catch{return reply.code(503).send({message:'日程数据暂不可用，未修改日历。'})}
  if(!parseSubscription(body.selection,data.catalog,{allowEmpty:true}))return reply.code(400).send({message:'选择中含无效项目，未修改日历。'})
  const db=await pool.connect()
  try{
   await db.query('BEGIN')
   // Serializes creation and edits for one account, including simultaneous first saves on two devices.
   await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id])
   const {rows}=await db.query('SELECT * FROM calendar_subscriptions WHERE user_id=$1 AND is_default',[user.id]);const before=rows[0]
   if((before&&(String(before.id)!==body.id||before.revision!==body.revision))||(!before&&(body.id!==null||body.revision!==null))){await db.query('ROLLBACK');return reply.code(409).send({message:'日历已在其他页面或设备修改，请重新载入后继续。'})}
   if(newCalendar&&!before){await db.query('ROLLBACK');return reply.code(409).send({message:'尚无默认日历，请先创建。'})}
   let saved
   if(before&&!newCalendar){
    saved=(await db.query('UPDATE calendar_subscriptions SET selection=$2,revision=revision+1,updated_at=NOW() WHERE id=$1 RETURNING *',[before.id,body.selection])).rows[0]
   }else{
    if(before)await db.query('UPDATE calendar_subscriptions SET is_default=FALSE WHERE id=$1',[before.id])
    saved=(await db.query('INSERT INTO calendar_subscriptions(user_id,token,selection) VALUES($1,$2,$3) RETURNING *',[user.id,randomBytes(32).toString('base64url'),body.selection])).rows[0]
   }
   await db.query('COMMIT');return {calendar:present(saved)}
  }catch(error){await db.query('ROLLBACK');throw error}finally{db.release()}
 }
 app.put('/api/calendar/v1/mine',{config:{rateLimit:{max:60,timeWindow:'1 minute'}}},(req,reply)=>save(req,reply,false))
 app.post('/api/calendar/v1/mine/new',{config:{rateLimit:{max:5,timeWindow:'1 minute'}}},(req,reply)=>save(req,reply,true))
 app.get('/api/calendar/v1/account.ics',{config:{rateLimit:{max:60,timeWindow:'1 minute'}}},async(req,reply)=>{
  // Random read-only capability URL: calendar clients do not send browser login cookies.
  reply.header('Cache-Control','private, no-cache').header('Referrer-Policy','no-referrer').header('X-Content-Type-Options','nosniff')
  if(Object.keys(req.query).some(k=>k!=='t')||typeof req.query.t!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(req.query.t))return reply.code(404).send({message:'Calendar not found'})
  const {rows}=await pool.query('SELECT selection,revision FROM calendar_subscriptions WHERE token=$1',[req.query.t])
  if(!rows[0])return reply.code(404).send({message:'Calendar not found'})
  try{
   const data=await loadData();const selection=parseSubscription(rows[0].selection,data.catalog,{allowEmpty:true})
   if(!selection)throw Error('Invalid stored selection')
   let {output}=await renderSelection(data,selection,getAnimeCalendar)
   // A display/filter edit changes calendar event content even when the source event revision is unchanged.
   output=output.replace(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g,(_,body)=>{
    const sequence=Number(body.match(/^SEQUENCE:(\d+)\r?$/m)?.[1]||0)+rows[0].revision
    return 'BEGIN:VEVENT\r\nSEQUENCE:'+Math.min(sequence,2147483647)+'\r\n'+body.replace(/^SEQUENCE:[^\r\n]*\r\n/gm,'')+'END:VEVENT'
   })
   const etag='"'+createHash('sha256').update(String(rows[0].revision)+output).digest('hex')+'"'
   reply.header('Content-Type','text/calendar; charset=utf-8').header('ETag',etag)
   if(req.headers['if-none-match']===etag)return reply.code(304).send()
   return reply.send(output)
  }catch{return reply.code(503).header('Retry-After','300').send({message:'Calendar temporarily unavailable; retain existing calendar'})}
 })
}
