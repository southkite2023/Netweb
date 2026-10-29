import crypto from 'node:crypto'

export const plans = [6,18,25].map((price, i) => ({ id: `monthly_${price}`, tier: i + 1, price, amount: `${price}.00`, months: 1 }))
export function matchesPayment(order, data, config) {
  return data.app_id === config.appId && data.seller_id === config.sellerId &&
    data.out_trade_no === order.id && data.total_amount === order.amount &&
    typeof data.trade_no === 'string' && /^\d{10,64}$/.test(data.trade_no) &&
    ['TRADE_SUCCESS','TRADE_FINISHED'].includes(data.trade_status)
}
export async function registerMembership(app, { pool, requireUser, origin, config = process.env, sdk: suppliedSdk }) {
  const enabled = config.ALIPAY_ENABLED === 'true' && config.MEMBERSHIP_SALES_ENABLED === 'true'
  const ready = enabled && ['ALIPAY_APP_ID','ALIPAY_SELLER_ID','ALIPAY_PRIVATE_KEY','ALIPAY_PUBLIC_KEY'].every(key => config[key])
  let sdk = suppliedSdk
  if (ready && !sdk) {
    const { AlipaySdk } = await import('alipay-sdk')
    sdk = new AlipaySdk({ appId: config.ALIPAY_APP_ID, privateKey: config.ALIPAY_PRIVATE_KEY.replace(/\\n/g, '\n'), alipayPublicKey: config.ALIPAY_PUBLIC_KEY.replace(/\\n/g, '\n'), signType: 'RSA2', timeout: 10000, keyType: config.ALIPAY_KEY_TYPE || 'PKCS8' })
  }
  const paymentConfig = { appId: config.ALIPAY_APP_ID, sellerId: config.ALIPAY_SELLER_ID }
  // Each signed transaction grants its month once, in the same transaction as the paid marker.
  async function settle(data) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query('SELECT id,user_id,plan_id,amount::text,status FROM membership_orders WHERE id=$1 FOR UPDATE', [data.out_trade_no])
      const order = rows[0]
      if (!order || !matchesPayment(order, data, paymentConfig)) throw new Error('Payment mismatch')
      if (order.status !== 'paid') {
        await client.query(`INSERT INTO memberships(user_id,plan_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 month')
          ON CONFLICT(user_id,plan_id) DO UPDATE SET expires_at=GREATEST(memberships.expires_at,NOW())+INTERVAL '1 month'`, [order.user_id,order.plan_id])
        await client.query(`UPDATE membership_orders SET status='paid',trade_no=$2,paid_at=NOW() WHERE id=$1`, [order.id,data.trade_no])
      }
      await client.query('COMMIT')
    } catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  }
  app.get('/api/membership/plans', async (_, reply) => {
    reply.header('Cache-Control','no-store')
    return { plans, ready: !!ready }
  })
  app.get('/api/membership/me', async (req, reply) => {
    reply.header('Cache-Control','no-store')
    const user = await requireUser(req,reply); if (!user) return
    const { rows } = await pool.query('SELECT plan_id AS "planId",expires_at AS "expiresAt" FROM memberships WHERE user_id=$1 AND expires_at>NOW() ORDER BY expires_at DESC',[user.id])
    return { memberships: rows }
  })
  app.post('/api/membership/orders', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const user = await requireUser(req,reply); if (!user) return
    if (!ready) return reply.code(503).send({ message: '支付宝收款尚未开通，暂不能购买。' })
    const plan = plans.find(p => p.id === req.body?.planId)
    if (!plan) return reply.code(400).send({ message: '请选择有效套餐。' })
    // Until upgrade benefits are agreed, do not silently combine or replace different tiers.
    const { rows: active } = await pool.query('SELECT plan_id FROM memberships WHERE user_id=$1 AND expires_at>NOW() AND plan_id<>$2',[user.id,plan.id])
    if (active.length) return reply.code(409).send({ message: '当前月卡有效期内，请续费同一档；跨档规则待确定。' })
    const id = crypto.randomBytes(20).toString('hex')
    const payUrl = sdk.pageExecute('alipay.trade.page.pay','GET', {
      notifyUrl: `${origin}/api/payments/alipay/notify`, returnUrl: `${origin}/vip?order=${id}`,
      bizContent: { out_trade_no: id, product_code: 'FAST_INSTANT_TRADE_PAY', total_amount: plan.amount, subject: `Yuashie ${plan.price}元会员月卡`, timeout_express: '30m', qr_pay_mode: '2' }
    })
    await pool.query(`INSERT INTO membership_orders(id,user_id,plan_id,amount) VALUES($1,$2,$3,$4)`,[id,user.id,plan.id,plan.amount])
    reply.header('Cache-Control','no-store')
    return { id, payUrl }
  })
  app.get('/api/membership/orders/:id', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    reply.header('Cache-Control','no-store')
    const user = await requireUser(req,reply); if (!user) return
    const { rows } = await pool.query('SELECT id,plan_id AS "planId",status FROM membership_orders WHERE id=$1 AND user_id=$2',[req.params.id,user.id])
    if (!rows[0]) return reply.code(404).send({ message: '订单不存在。' })
    if (ready && rows[0].status === 'pending') {
      try {
        const result = await sdk.exec('alipay.trade.query', { bizContent: { out_trade_no: rows[0].id } }, { validateSign: true })
        if (result.code === '10000') {
          await settle({ app_id: paymentConfig.appId, seller_id: result.sellerId, out_trade_no: result.outTradeNo,
            total_amount: result.totalAmount, trade_no: result.tradeNo, trade_status: result.tradeStatus })
          rows[0].status = 'paid'
        }
      } catch { /* A failed query never grants membership; signed notifications still retry. */ }
    }
    return rows[0]
  })
  await app.register(async callbacks => {
    callbacks.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string', bodyLimit: 16384 }, (_, body, done) => {
      const params = new URLSearchParams(body)
      if ([...params.keys()].some(key => params.getAll(key).length !== 1)) return done(new Error('Duplicate payment field'))
      done(null,Object.fromEntries(params))
    })
    callbacks.post('/api/payments/alipay/notify', async (req, reply) => {
      reply.type('text/plain')
      try {
        if (!ready || req.body?.sign_type !== 'RSA2' || !sdk.checkNotifySignV2(req.body)) return reply.code(400).send('failure')
        await settle(req.body); return 'success'
      }
      catch { return reply.code(400).send('failure') }
    })
  })
}
