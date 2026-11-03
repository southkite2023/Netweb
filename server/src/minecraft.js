import { execFile } from 'node:child_process'
const validName = value => typeof value === 'string' && /^[A-Za-z0-9_]{3,16}$/.test(value)
export async function lookupJavaProfile(name, transport = fetch) {
  if (!validName(name)) throw new Error('invalid_name')
  const response = await transport(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(10000), redirect:'error' })
  if (response.status===404 || response.status===204) throw new Error('profile_not_found')
  if (!response.ok) throw new Error('profile_unavailable')
  const profile=await response.json()
  if (!/^[a-f0-9]{32}$/i.test(profile.id || '') || !validName(profile.name) || profile.name.toLowerCase()!==name.toLowerCase()) throw new Error('profile_unavailable')
  const id=profile.id.toLowerCase()
  return { uuid:`${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`, name:profile.name }
}
export function minecraftBridge(operation, account) {
  return new Promise((resolve,reject)=>{
    const child=execFile('/usr/bin/ssh',['-T','-F','/dev/null','-i',process.env.MC_SSH_KEY || '/var/lib/yuashie-minecraft/id_ed25519','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o',`UserKnownHostsFile=${process.env.MC_SSH_KNOWN_HOSTS || '/var/lib/yuashie-minecraft/known_hosts'}`,'-o','ConnectTimeout=5','ubuntu@139.155.146.68'],{timeout:20000,maxBuffer:8192},(error,stdout)=>{
      if (error) return reject(new Error('server_unavailable'))
      try { const result=JSON.parse(stdout); if (!result.ok) throw new Error(); resolve(result) } catch { reject(new Error('server_operation_failed')) }
    })
    child.stdin.end(JSON.stringify({operation,uuid:account.minecraft_uuid,name:account.minecraft_name}))
  })
}
export function registerMinecraft(app,{pool,requireUser,bridge=minecraftBridge,transport=fetch}) {
  const audit=(user,event,detail='')=>pool.query('INSERT INTO minecraft_audit(user_id,event,detail) VALUES($1,$2,$3)',[user,event,detail])
  const view=row=>row ? { minecraftName:row.minecraft_name,uuid:row.minecraft_uuid,profileResolved:Boolean(row.minecraft_uuid),status:row.status,syncMessage:row.sync_message,syncedAt:row.synced_at } : null
  async function sync(row) {
    if (!row.minecraft_uuid) throw new Error('profile_required')
    try {
      const result=await bridge('add',row)
      const active=result.present===true
      await pool.query(`UPDATE minecraft_accounts SET status=$2,sync_message=$3,synced_at=CASE WHEN $4 THEN COALESCE(synced_at,NOW()) ELSE synced_at END,updated_at=NOW() WHERE id=$1`,[row.id,active?'active':'error',active?'已加入 Minecraft 原生白名单。':'白名单未生效或已被管理员移除，请联系管理员；网站不会重复添加已处理记录。',active])
      if (active) await pool.query("INSERT INTO user_badges(user_id,badge_key,source) VALUES($1,'minecraft_pioneer','automatic') ON CONFLICT DO NOTHING",[row.user_id])
      await audit(row.user_id,active?'whitelist_confirmed':'whitelist_not_readded',row.minecraft_uuid)
    } catch {
      await pool.query(`UPDATE minecraft_accounts SET status='error',sync_message='服务器暂时不可用，请稍后重试同步。',updated_at=NOW() WHERE id=$1`,[row.id])
      await audit(row.user_id,'whitelist_sync_failed',row.minecraft_uuid)
    }
  }
  app.get('/api/minecraft/config',async(_,reply)=>{reply.header('Cache-Control','no-store');return {enabled:true,mode:'java-name',server:'139.155.146.68:25565'}})
  app.get('/api/minecraft/me',async(req,reply)=>{
    reply.header('Cache-Control','no-store'); const user=await requireUser(req,reply);if(!user)return
    const {rows}=await pool.query('SELECT * FROM minecraft_accounts WHERE user_id=$1',[user.id]); const row=rows[0];let access='unknown'
    if(row?.minecraft_uuid && row.synced_at) {try {access=(await bridge('status',row)).present?'present':'removed'}catch{access='unavailable'}}
    return {account:view(row),access}
  })
  app.post('/api/minecraft/bind',{config:{rateLimit:{max:6,timeWindow:'1 hour'}}},async(req,reply)=>{
    const user=await requireUser(req,reply);if(!user)return
    const name=String(req.body?.minecraftName || '').trim()
    try {
      const profile=await lookupJavaProfile(name,transport)
      const {rows}=await pool.query(`INSERT INTO minecraft_accounts(user_id,minecraft_name,minecraft_uuid,status,sync_message) VALUES($1,$2,$3,'pending','正在同步原生白名单。') ON CONFLICT(user_id) DO UPDATE SET minecraft_name=EXCLUDED.minecraft_name,minecraft_uuid=EXCLUDED.minecraft_uuid,updated_at=NOW() WHERE minecraft_accounts.minecraft_uuid IS NULL OR minecraft_accounts.minecraft_uuid=EXCLUDED.minecraft_uuid RETURNING *`,[user.id,profile.name,profile.uuid])
      if(!rows[0]) return reply.code(409).send({message:'网站账号已登记另一玩家，请联系管理员更换。'})
      await audit(user.id,'official_profile_resolved',profile.uuid)
      await sync(rows[0]);const result=await pool.query('SELECT * FROM minecraft_accounts WHERE user_id=$1',[user.id])
      return {account:view(result.rows[0])}
    } catch(error) {
      const messages={invalid_name:'玩家名需为 3–16 位英文字母、数字或下划线。',profile_not_found:'未找到此 Minecraft Java 玩家，请核对游戏内名称。',profile_unavailable:'Minecraft 官方档案服务暂时不可用，请稍后重试。'}
      if(error.code==='23505')return reply.code(409).send({message:'此玩家名或 UUID 已被另一网站账户登记，请联系管理员。'})
      if(messages[error.message])return reply.code(error.message==='invalid_name'?400:error.message==='profile_not_found'?404:503).send({message:messages[error.message]})
      req.log.error({event:'minecraft_binding_failed',code:error.code || 'unknown'},'Minecraft binding failed')
      return reply.code(503).send({message:'白名单处理暂时失败，请刷新状态后重试。'})
    }
  })
  app.post('/api/minecraft/sync',{config:{rateLimit:{max:6,timeWindow:'1 hour'}}},async(req,reply)=>{
    const user=await requireUser(req,reply);if(!user)return
    const {rows}=await pool.query('SELECT * FROM minecraft_accounts WHERE user_id=$1',[user.id])
    if(!rows[0])return reply.code(404).send({message:'请先填写 Java 玩家名。'})
    if(!rows[0].minecraft_uuid) {
      try {
        const profile=await lookupJavaProfile(rows[0].minecraft_name,transport)
        await pool.query('UPDATE minecraft_accounts SET minecraft_uuid=$2,minecraft_name=$3,updated_at=NOW() WHERE id=$1',[rows[0].id,profile.uuid,profile.name])
        rows[0].minecraft_uuid=profile.uuid; rows[0].minecraft_name=profile.name
      } catch { return reply.code(503).send({message:'无法查询此玩家的官方 UUID，请核对名称或稍后重试。'}) }
    }
    await sync(rows[0]);const result=await pool.query('SELECT * FROM minecraft_accounts WHERE user_id=$1',[user.id]);return {account:view(result.rows[0])}
  })
  // Old pull bridge is closed, preventing unvalidated legacy records from syncing.
  app.get('/api/minecraft/bridge/pending',async(_,reply)=>reply.code(410).send('Legacy bridge disabled.'))
  for(const action of ['complete','fail'])app.post(`/api/minecraft/bridge/:id/${action}`,async(_,reply)=>reply.code(410).send('Legacy bridge disabled.'))
}
