import crypto from 'node:crypto'
export const validPath = value => typeof value === 'string' && /^\/(?!\/)[A-Za-z0-9/_-]{0,299}$/.test(value)
export const validKeys = keys => Array.isArray(keys) && keys.length <= 1000 && keys.every(k => typeof k === 'string' && /^(reply|feedback|badge|broadcast):[^\s]{1,180}$/.test(k))
export function validPreferences(body) {
  return body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).every(k => ['language','theme'].includes(k)) &&
    (body.language === undefined || ['zh','en','ja'].includes(body.language)) && (body.theme === undefined || ['dark','light'].includes(body.theme))
}
export function csrfToken(session, secret) { return crypto.createHmac('sha256', secret).update(session).digest('hex') }
export function safeEqual(a, b) { return typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) }

export function registerCloudSync(app, pool, authenticate, cookieName, hashToken) {
  async function requireUser(req, reply) {
    const u = await authenticate(req, reply)
    if (!u) return null
    if (req.headers['x-sync-user'] && String(u.id) !== req.headers['x-sync-user']) {
      reply.code(409).send({ message: 'Account changed. Reload before syncing.' }); return null
    }
    return u
  }
  app.addHook('onSend', async (req, reply, payload) => {
    if (req.url.startsWith('/api/') && (req.cookies[cookieName] || /^\/api\/(auth|sync|notifications)(\/|$|\?)/.test(req.url))) reply.header('Cache-Control', 'no-store')
    return payload
  })
  app.get('/api/sync', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return
    const favorites = await pool.query('SELECT path FROM user_favorites WHERE user_id=$1 ORDER BY path', [u.id])
    const preferences = await pool.query('SELECT language,theme FROM user_preferences WHERE user_id=$1', [u.id])
    return { favorites: favorites.rows.map(r => r.path), preferences: preferences.rows[0] || {} }
  })
  app.put('/api/sync/favorites', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return
    if (!validPath(req.body?.path) || typeof req.body?.saved !== 'boolean') return reply.code(400).send({ message: 'Invalid favorite.' })
    if (req.body.saved) await pool.query('INSERT INTO user_favorites(user_id,path) VALUES($1,$2) ON CONFLICT DO NOTHING', [u.id,req.body.path])
    else await pool.query('DELETE FROM user_favorites WHERE user_id=$1 AND path=$2', [u.id,req.body.path])
    return { ok: true }
  })
  app.patch('/api/sync/preferences', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return
    if (!validPreferences(req.body)) return reply.code(400).send({ message: 'Invalid preferences.' })
    await pool.query(`INSERT INTO user_preferences(user_id,language,theme) VALUES($1,$2,$3)
      ON CONFLICT(user_id) DO UPDATE SET language=COALESCE(EXCLUDED.language,user_preferences.language),theme=COALESCE(EXCLUDED.theme,user_preferences.theme),updated_at=NOW()`, [u.id,req.body.language || null,req.body.theme || null])
    return { ok: true }
  })
  app.post('/api/sync/import', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return
    const { favorites = [], reads = [], preferences = {} } = req.body || {}
    if (!Array.isArray(favorites) || favorites.length > 1000 || !favorites.every(validPath) || !validKeys(reads) || !validPreferences(preferences)) return reply.code(400).send({ message: 'Invalid import.' })
    const db = await pool.connect()
    try {
      await db.query('BEGIN')
      await db.query('INSERT INTO user_favorites(user_id,path) SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING', [u.id,favorites])
      await db.query('INSERT INTO notification_reads(user_id,key) SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING', [u.id,reads])
      await db.query('INSERT INTO user_preferences(user_id,language,theme) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [u.id,preferences.language || null,preferences.theme || null])
      await db.query('COMMIT'); return { ok: true }
    } catch (e) { await db.query('ROLLBACK'); throw e } finally { db.release() }
  })
  app.put('/api/notifications/read', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return
    if (!validKeys(req.body?.keys)) return reply.code(400).send({ message: 'Invalid read keys.' })
    await pool.query('INSERT INTO notification_reads(user_id,key) SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING', [u.id,req.body.keys])
    return { ok: true }
  })
  app.get('/api/notifications', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return
    // Materialize only actual account events; the primary key makes repeated reads idempotent.
    const replies = await pool.query(`SELECT c.id,c.content,c.project_id AS project,u.display_name AS author,c.created_at AS time FROM comments c JOIN comments p ON p.id=c.parent_id JOIN users u ON u.id=c.user_id WHERE p.user_id=$1 AND c.user_id<>$1 AND c.status='visible' AND p.status='visible'`, [u.id])
    const feedback = await pool.query(`SELECT id,type,title,status,admin_note AS body,updated_at,COALESCE(reviewed_at,updated_at) AS time FROM feedback WHERE user_id=$1 AND status IN ('valid','fixed','adopted','rejected')`, [u.id])
    const badges = await pool.query(`SELECT b.key,b.name,b.emoji,b.description,ub.awarded_at AS time FROM user_badges ub JOIN badges b ON b.key=ub.badge_key WHERE ub.user_id=$1`, [u.id])
    const broadcasts = await pool.query(`SELECT c.id,c.content,c.created_at AS time FROM comments c JOIN users u ON u.id=c.user_id WHERE c.project_id='site-broadcast' AND c.parent_id IS NULL AND c.status='visible' AND u.role='admin'`)
    const events = [
      ...replies.rows.map(r => ({ ...r, key: `reply:${r.id}`, kind: 'reply' })),
      ...feedback.rows.map(r => ({ ...r, key: `feedback:${r.id}:${r.status}:${r.updated_at.toISOString()}`, kind: 'feedback' })),
      ...badges.rows.map(r => ({ ...r, key: `badge:${r.key}:${r.time.toISOString()}`, kind: 'badge' })),
    ]
    const parsed = broadcasts.rows.flatMap(r => {
      if (!r.content.startsWith('__YUASHIE_BROADCAST_V1__\n')) return []
      try { const data = JSON.parse(r.content.slice('__YUASHIE_BROADCAST_V1__\n'.length)); return typeof data.title === 'string' && typeof data.body === 'string' ? [{ ...r, title: data.title, body: data.body, replaces: data.replaces }] : [] } catch { return [] }
    })
    const replaced = new Set(parsed.map(r => String(r.replaces)))
    events.push(...parsed.filter(r => !replaced.has(String(r.id))).map(r => ({ ...r, key: `broadcast:${r.id}`, kind: 'broadcast' })))
    const db = await pool.connect()
    try {
      await db.query('BEGIN')
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [u.id])
      // Refresh the snapshot transactionally so deleted source content cannot remain visible.
      await db.query('DELETE FROM user_notifications WHERE user_id=$1', [u.id])
      await db.query(`INSERT INTO user_notifications(user_id,key,payload,created_at)
        SELECT $1,x.key,x.payload,x.created_at FROM jsonb_to_recordset($2::jsonb) AS x(key text,payload jsonb,created_at timestamptz)
        ON CONFLICT DO NOTHING`, [u.id,JSON.stringify(events.map(e => ({ key:e.key, payload:e, created_at:e.time })))])
      const result = await db.query('SELECT n.payload,r.read_at IS NOT NULL AS read FROM user_notifications n LEFT JOIN notification_reads r ON r.user_id=n.user_id AND r.key=n.key WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 120', [u.id])
      await db.query('COMMIT'); return { notifications: result.rows.map(r => ({ ...r.payload, read: r.read })) }
    } catch (e) { await db.query('ROLLBACK'); throw e } finally { db.release() }
  })
  app.get('/api/auth/sessions', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return
    const result = await pool.query('SELECT id,device,created_at AS "createdAt",expires_at AS "expiresAt",token_hash=$2 AS current FROM sessions WHERE user_id=$1 AND expires_at>NOW() ORDER BY created_at DESC', [u.id,hashToken(req.cookies[cookieName])])
    return { sessions: result.rows }
  })
  app.delete('/api/auth/sessions/:id', async (req, reply) => {
    const u = await requireUser(req, reply); if (!u) return
    if (!/^\d+$/.test(req.params.id)) return reply.code(400).send({ message: 'Invalid session.' })
    const result = await pool.query('DELETE FROM sessions WHERE user_id=$1 AND id=$2 RETURNING token_hash', [u.id,req.params.id])
    if (result.rows[0]?.token_hash === hashToken(req.cookies[cookieName])) reply.clearCookie(cookieName, { path: '/' })
    return { ok: true }
  })
}
