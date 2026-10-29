import crypto from 'node:crypto'
const fields = ['id','provider','category','name','key','accessKeyId','endpoint','balancePath','currency']
export function validParameters(p) {
 return p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length === fields.length && fields.every(k => typeof p[k] === 'string') &&
 /^[a-z0-9_]{1,160}$/.test(p.id) && ['deepseek','openrouter','oneapi','custom','aliyun','tencent','kimi','zhipu','openai','subscription'].includes(p.provider) &&
 ['ai','cloud','nodes'].includes(p.category) && p.name.trim().length > 0 && p.name.length <= 60 && p.key.length <= 4096 && p.accessKeyId.length <= 128 && p.endpoint.length <= 4096 && p.balancePath.length <= 200 && /^[A-Z]{3}$/.test(p.currency)
}
function key() {
 const value = process.env.ASTRACCT_PARAMETERS_KEY || ''
 return /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value,'hex') : null
}
export function encryptParameters(p,userId,secret) {
 const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm',secret,iv)
 cipher.setAAD(Buffer.from(`astracct:v1:${userId}:${p.id}`))
 const data = Buffer.concat([cipher.update(JSON.stringify(p),'utf8'),cipher.final()])
 return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64')
}
export function decryptParameters(value,userId,id,secret) {
 const data = Buffer.from(value,'base64'), cipher = crypto.createDecipheriv('aes-256-gcm',secret,data.subarray(0,12))
 cipher.setAAD(Buffer.from(`astracct:v1:${userId}:${id}`)); cipher.setAuthTag(data.subarray(12,28))
 return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString('utf8'))
}
export function registerAstracctParameters(app,pool,requireUser) {
 app.addHook('onSend',async (req,reply,payload) => { if(req.url.startsWith('/api/astracct/parameters')) reply.header('Cache-Control','no-store'); return payload })
 app.post('/api/astracct/parameters',{bodyLimit:16384},async (req,reply) => {
  const user = await requireUser(req,reply); if(!user) return
  const secret = key(); if(!secret) return reply.code(503).send({message:'云端参数服务暂不可用，请稍后重试。'})
  if(req.body?.version !== 1 || !validParameters(req.body.parameters)) return reply.code(400).send({message:'参数格式无效。'})
  const p = req.body.parameters
  await pool.query(`INSERT INTO astracct_parameters(user_id,account_id,payload) VALUES($1,$2,$3) ON CONFLICT(user_id,account_id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()`,[user.id,p.id,encryptParameters(p,user.id,secret)])
  return {ok:true,version:1}
 })
 // Reserved for future same-account autofill; identity always comes from the session.
 app.get('/api/astracct/parameters',async (req,reply) => {
  const user = await requireUser(req,reply); if(!user) return
  const secret = key(); if(!secret) return reply.code(503).send({message:'云端参数服务暂不可用，请稍后重试。'})
  const {rows} = await pool.query('SELECT account_id,payload,updated_at FROM astracct_parameters WHERE user_id=$1 ORDER BY updated_at DESC',[user.id])
  return {version:1,accounts:rows.map(r=>({parameters:decryptParameters(r.payload,user.id,r.account_id,secret),updatedAt:r.updated_at}))}
 })
 app.delete('/api/astracct/parameters/:id',async(req,reply)=>{
  const user = await requireUser(req,reply); if(!user) return
  if(!/^[a-z0-9_]{1,160}$/.test(req.params.id)) return reply.code(400).send({message:'参数标识无效。'})
  await pool.query('DELETE FROM astracct_parameters WHERE user_id=$1 AND account_id=$2',[user.id,req.params.id]); return {ok:true}
 })
}
