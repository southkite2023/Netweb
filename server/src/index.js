import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import argon2 from 'argon2'
import pg from 'pg'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const app = Fastify({ logger: true, trustProxy: true, bodyLimit: 1024 * 1024 })
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const PORT = Number(process.env.PORT || 3000)
const ORIGIN = process.env.SITE_ORIGIN || 'https://yuashie.cn'
const COOKIE = 'yuashie_session'
const DAY = 86400
const FOUNDING_CUTOFF = '2027-01-01T00:00:00+08:00'
const USER_CONTENT_DIR = process.env.USER_CONTENT_DIR || '/var/www/yuashie-app/user-content'
const AVATAR_DIR = path.join(USER_CONTENT_DIR, 'avatars')
const QSL_DIR = path.join(USER_CONTENT_DIR, 'qsl')
const AVATAR_MAX_BYTES = 512 * 1024
const QSL_MAX_BYTES = 5 * 1024 * 1024

await fs.mkdir(AVATAR_DIR, { recursive: true })
await fs.mkdir(QSL_DIR, { recursive: true })
await app.register(cookie)
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })

app.addHook('onRequest', async (req, reply) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin
    if (origin && origin !== ORIGIN) {
      return reply.code(403).send({ message: 'Invalid request origin.' })
    }
  }
})

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')
const level = points => points >= 2000 ? 5 : points >= 800 ? 4 : points >= 300 ? 3 : points >= 100 ? 2 : points >= 20 ? 1 : 0
const avatarUrl = filename => filename ? `/api/avatars/${encodeURIComponent(filename)}` : null

async function syncAutomaticBadges(userId, db = pool) {
  await db.query(`
    INSERT INTO user_badges(user_id, badge_key, source)
    SELECT u.id, 'founding_member', 'automatic'
    FROM users u
    WHERE u.id=$1 AND u.created_at < $2::timestamptz
    ON CONFLICT DO NOTHING
  `, [userId, FOUNDING_CUTOFF])

  const automaticRules = [
    ['contribution_1000', `SELECT contribution_points >= 1000 AS earned FROM users WHERE id=$1`],
    ['bug_hunter', `SELECT COUNT(*) >= 5 AS earned FROM feedback WHERE user_id=$1 AND type='bug' AND status IN ('valid','fixed')`],
    ['thinker', `SELECT COUNT(*) >= 5 AS earned FROM feedback WHERE user_id=$1 AND type='suggestion' AND status='adopted'`],
    ['radio_operator', `SELECT EXISTS(SELECT 1 FROM radio_profiles WHERE user_id=$1) AS earned`],
  ]

  for (const [badgeKey, sql] of automaticRules) {
    const { rows } = await db.query(sql, [userId])
    if (rows[0]?.earned) {
      await db.query(`
        INSERT INTO user_badges(user_id,badge_key,source)
        VALUES($1,$2,'automatic') ON CONFLICT DO NOTHING
      `, [userId, badgeKey])
    } else {
      await db.query(`DELETE FROM user_badges WHERE user_id=$1 AND badge_key=$2 AND source='automatic'`, [userId, badgeKey])
      await db.query(`UPDATE users SET equipped_badge_key=NULL WHERE id=$1 AND equipped_badge_key=$2`, [userId, badgeKey])
    }
  }
}

async function publicUser(user) {
  await syncAutomaticBadges(user.id)
  const { rows: badges } = await pool.query(`
    SELECT b.key, b.name, b.emoji, b.description, b.rule_type AS "ruleType",
           ub.awarded_at AS "awardedAt"
    FROM user_badges ub
    JOIN badges b ON b.key=ub.badge_key
    WHERE ub.user_id=$1
    ORDER BY b.sort_order, ub.awarded_at
  `, [user.id])

  const equippedBadge = badges.find(badge => badge.key === user.equipped_badge_key) || null
  const { rows: radioRows } = await pool.query(`
    SELECT callsign,operator_class,callsign_country,verification_status,qth,rig,antenna,default_power_w,bio,created_at,updated_at
    FROM radio_profiles WHERE user_id=$1
  `, [user.id])
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    website: user.website,
    avatarUrl: avatarUrl(user.avatar_filename),
    role: user.role,
    contributionPoints: user.contribution_points,
    level: level(user.contribution_points),
    createdAt: user.created_at,
    badges,
    equippedBadge,
    radioProfile: radioProfile(radioRows[0]),
  }
}

function publicAuthor(row) {
  return {
    username: row.username,
    displayName: row.display_name,
    avatarUrl: avatarUrl(row.avatar_filename),
    role: row.role,
    equippedBadge: row.badge_key ? {
      key: row.badge_key,
      name: row.badge_name,
      emoji: row.badge_emoji,
      description: row.badge_description,
    } : null,
    radioProfile: row.radio_callsign ? {
      callsign: row.radio_callsign,
      operatorClass: row.radio_operator_class,
      verificationStatus: row.radio_verification_status,
    } : null,
  }
}

async function currentUser(req) {
  const token = req.cookies[COOKIE]
  if (!token) return null
  const { rows } = await pool.query(`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>NOW()
  `, [hashToken(token)])
  return rows[0] || null
}

async function requireUser(req, reply) {
  const user = await currentUser(req)
  if (!user) {
    reply.code(401).send({ message: 'Please sign in.' })
    return null
  }
  return user
}

async function requireAdmin(req, reply) {
  const user = await requireUser(req, reply)
  if (!user) return null
  if (user.role !== 'admin') {
    reply.code(403).send({ message: 'Admin access required.' })
    return null
  }
  return user
}

async function createSession(userId, reply) {
  const token = crypto.randomBytes(32).toString('base64url')
  await pool.query(`
    INSERT INTO sessions(user_id,token_hash,expires_at)
    VALUES($1,$2,NOW()+INTERVAL '30 days')
  `, [userId, hashToken(token)])
  reply.setCookie(COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * DAY,
  })
}

async function addContribution(client, userId, { type, points, reason, referenceType = null, referenceId = null }) {
  const result = await client.query(`
    INSERT INTO contribution_events(user_id,type,points,reason,reference_type,reference_id)
    VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT DO NOTHING
    RETURNING id
  `, [userId, type, points, reason, referenceType, referenceId])
  if (result.rowCount) {
    await client.query('UPDATE users SET contribution_points=GREATEST(0, contribution_points+$1), updated_at=NOW() WHERE id=$2', [points, userId])
  }
  return Boolean(result.rowCount)
}

async function removeContribution(client, userId, { type, referenceType, referenceId }) {
  const { rows } = await client.query(`
    DELETE FROM contribution_events
    WHERE user_id=$1 AND type=$2 AND reference_type=$3 AND reference_id=$4
    RETURNING points
  `, [userId, type, referenceType, referenceId])
  if (rows[0]) {
    await client.query('UPDATE users SET contribution_points=GREATEST(0, contribution_points-$1), updated_at=NOW() WHERE id=$2', [rows[0].points, userId])
  }
  return Boolean(rows[0])
}

function parseAvatarDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') throw new Error('Invalid avatar.')
  const match = /^data:(image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl)
  if (!match) throw new Error('Avatar must be PNG, JPEG, or WebP.')
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length || buffer.length > AVATAR_MAX_BYTES) throw new Error('Avatar must be 512 KB or smaller.')

  const mime = match[1]
  const png = buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  const jpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const webp = buffer.length > 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  if ((mime === 'image/png' && !png) || (mime === 'image/jpeg' && !jpg) || (mime === 'image/webp' && !webp)) {
    throw new Error('Avatar file signature is invalid.')
  }
  return { buffer, ext: mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg' }
}

function parseQslDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') throw new Error('Invalid QSL image.')
  const match = /^data:(image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl)
  if (!match) throw new Error('QSL must be PNG, JPEG, or WebP.')
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length || buffer.length > QSL_MAX_BYTES) throw new Error('QSL image must be 5 MB or smaller.')
  const mime = match[1]
  const png = buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  const jpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const webp = buffer.length > 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  if ((mime === 'image/png' && !png) || (mime === 'image/jpeg' && !jpg) || (mime === 'image/webp' && !webp)) throw new Error('QSL image signature is invalid.')
  return { buffer, ext: mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg' }
}

function normalizeCallsign(value) {
  return String(value || '').trim().toUpperCase()
}

function validCallsign(value) {
  return /^[A-Z0-9/]{3,20}$/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value)
}

function radioProfile(row) {
  if (!row) return null
  return {
    callsign: row.callsign,
    operatorClass: row.operator_class,
    callsignCountry: row.callsign_country,
    verificationStatus: row.verification_status,
    qth: row.qth || '',
    rig: row.rig || '',
    antenna: row.antenna || '',
    defaultPowerW: row.default_power_w == null ? null : Number(row.default_power_w),
    bio: row.bio || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function qsoLog(row) {
  if (!row) return null
  return {
    id: row.id,
    myCallsign: row.my_callsign,
    remoteCallsign: row.remote_callsign,
    date: row.qso_date,
    time: String(row.qso_time || '').slice(0, 8),
    frequencyMHz: Number(row.frequency_mhz),
    mode: row.mode,
    rstSent: row.rst_sent || '',
    rstReceived: row.rst_received || '',
    powerSentW: row.power_sent_w == null ? null : Number(row.power_sent_w),
    powerReceivedW: row.power_received_w == null ? null : Number(row.power_received_w),
    qth: row.qth || '',
    rig: row.rig || '',
    antenna: row.antenna || '',
    notes: row.notes || '',
    qslRequested: row.qsl_requested,
    qslSent: row.qsl_sent,
    qslReceived: row.qsl_received,
    matchedQsoId: row.matched_qso_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function qslTemplate(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    imageUrl: `/api/radio/qsl-images/${encodeURIComponent(row.image_filename)}`,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseOptionalPower(value, field) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 1000000) throw new Error(`${field} must be between 0 and 1,000,000 W.`)
  return number
}

function validateQsoPayload(body, profile) {
  const remoteCallsign = normalizeCallsign(body?.remoteCallsign)
  if (!validCallsign(remoteCallsign)) throw new Error('Invalid remote callsign.')
  const date = String(body?.date || '')
  const time = String(body?.time || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid QSO date.')
  const parsedDate = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== date) throw new Error('Invalid QSO date.')
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) throw new Error('Invalid QSO time.')
  const [hour, minute, second = '0'] = time.split(':').map(Number)
  if (hour > 23 || minute > 59 || second > 59) throw new Error('Invalid QSO time.')
  const frequencyMHz = Number(body?.frequencyMHz)
  if (!Number.isFinite(frequencyMHz) || frequencyMHz <= 0 || frequencyMHz > 1000000) throw new Error('Invalid frequency.')
  const mode = String(body?.mode || '').trim().toUpperCase()
  if (!/^[A-Z0-9+/-]{1,20}$/.test(mode)) throw new Error('Invalid mode.')
  const text = (value, max, field) => {
    const out = String(value || '').trim()
    if (out.length > max) throw new Error(`${field} is too long.`)
    return out
  }
  return {
    myCallsign: profile.callsign,
    remoteCallsign,
    date,
    time: time.length === 5 ? `${time}:00` : time,
    frequencyMHz,
    mode,
    rstSent: text(body?.rstSent, 12, 'RST sent'),
    rstReceived: text(body?.rstReceived, 12, 'RST received'),
    powerSentW: parseOptionalPower(body?.powerSentW, 'Power sent'),
    powerReceivedW: parseOptionalPower(body?.powerReceivedW, 'Power received'),
    qth: text(body?.qth, 120, 'QTH'),
    rig: text(body?.rig, 120, 'Rig'),
    antenna: text(body?.antenna, 160, 'Antenna'),
    notes: text(body?.notes, 1000, 'Notes'),
    qslRequested: Boolean(body?.qslRequested),
    qslSent: Boolean(body?.qslSent),
    qslReceived: Boolean(body?.qslReceived),
  }
}

app.get('/api/health', async () => ({ ok: true, version: '0.3.0' }))

app.get('/api/avatars/:filename', async (req, reply) => {
  const filename = req.params.filename
  if (!/^\d+-\d+-[a-f0-9]{12}\.(png|jpg|webp)$/.test(filename)) return reply.code(404).send({ message: 'Avatar not found.' })
  try {
    const data = await fs.readFile(path.join(AVATAR_DIR, filename))
    const ext = path.extname(filename).slice(1)
    reply.header('Cache-Control', 'public, max-age=86400')
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.type(ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
    return reply.send(data)
  } catch (error) {
    if (error.code === 'ENOENT') return reply.code(404).send({ message: 'Avatar not found.' })
    throw error
  }
})

app.get('/api/badges', async () => {
  const { rows } = await pool.query(`
    SELECT key, name, emoji, description, rule_type AS "ruleType"
    FROM badges
    ORDER BY sort_order, key
  `)
  return { badges: rows }
})

app.get('/api/auth/me', async (req, reply) => {
  const user = await currentUser(req)
  if (!user) return reply.code(401).send({ message: 'Not signed in.' })
  return { user: await publicUser(user) }
})

app.post('/api/auth/register', {
  config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
}, async (req, reply) => {
  const { username, email, password, displayName } = req.body || {}
  if (!/^[A-Za-z0-9_-]{3,24}$/.test(username || '')) return reply.code(400).send({ message: 'Invalid username.' })
  if (typeof password !== 'string' || password.length < 6) return reply.code(400).send({ message: 'Password must be at least 6 characters.' })
  if (password.length > 128) return reply.code(400).send({ message: 'Password is too long.' })
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return reply.code(400).send({ message: 'Invalid email.' })
  if (!displayName?.trim()) return reply.code(400).send({ message: 'Display name is required.' })

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`
      INSERT INTO users(username,email,password_hash,display_name)
      VALUES($1,$2,$3,$4)
      RETURNING *
    `, [username, email.toLowerCase(), passwordHash, displayName.trim()])
    const user = rows[0]
    await client.query(`
      INSERT INTO contribution_events(user_id,type,points,reason)
      VALUES($1,'ACCOUNT_CREATED',5,'Account created')
    `, [user.id])
    await syncAutomaticBadges(user.id, client)
    await client.query('COMMIT')
    await createSession(user.id, reply)
    return reply.code(201).send({ user: await publicUser(user) })
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') return reply.code(409).send({ message: 'Username or email is already in use.' })
    throw error
  } finally {
    client.release()
  }
})

app.post('/api/auth/login', {
  config: { rateLimit: { max: 8, timeWindow: '15 minutes' } },
}, async (req, reply) => {
  const { email, password } = req.body || {}
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [(email || '').toLowerCase()])
  const user = rows[0]
  if (!user || !await argon2.verify(user.password_hash, password || '')) return reply.code(401).send({ message: 'Email or password is incorrect.' })
  await createSession(user.id, reply)
  return { user: await publicUser(user) }
})

app.post('/api/auth/logout', async (req, reply) => {
  const token = req.cookies[COOKIE]
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)])
  reply.clearCookie(COOKIE, { path: '/' })
  return { ok: true }
})

app.get('/api/users/:username', async (req, reply) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE lower(username)=lower($1)', [req.params.username])
  if (!rows[0]) return reply.code(404).send({ message: 'User not found.' })
  return { user: await publicUser(rows[0]) }
})

app.get('/api/users/:username/contributions', async (req, reply) => {
  const { rows: users } = await pool.query('SELECT id FROM users WHERE lower(username)=lower($1)', [req.params.username])
  if (!users[0]) return reply.code(404).send({ message: 'User not found.' })
  const { rows } = await pool.query(`
    SELECT type,points,reason,reference_type AS "referenceType",reference_id AS "referenceId",created_at AS "createdAt"
    FROM contribution_events
    WHERE user_id=$1
    ORDER BY created_at DESC,id DESC
    LIMIT 50
  `, [users[0].id])
  return { events: rows }
})

app.patch('/api/users/me', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { displayName, bio = '', website = '' } = req.body || {}
  if (!displayName?.trim()) return reply.code(400).send({ message: 'Display name is required.' })
  if (bio.length > 280 || website.length > 300) return reply.code(400).send({ message: 'Profile is too long.' })
  if (website && !/^https?:\/\//i.test(website)) return reply.code(400).send({ message: 'Website must start with http:// or https://' })
  const { rows } = await pool.query(`
    UPDATE users SET display_name=$1,bio=$2,website=$3,updated_at=NOW() WHERE id=$4 RETURNING *
  `, [displayName.trim(), bio.trim(), website.trim(), user.id])
  return { user: await publicUser(rows[0]) }
})

app.patch('/api/users/me/avatar', {
  config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  let parsed
  try { parsed = parseAvatarDataUrl(req.body?.dataUrl) }
  catch (error) { return reply.code(400).send({ message: error.message }) }

  const filename = `${user.id}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${parsed.ext}`
  await fs.writeFile(path.join(AVATAR_DIR, filename), parsed.buffer, { flag: 'wx' })
  const { rows } = await pool.query('UPDATE users SET avatar_filename=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [filename, user.id])
  if (user.avatar_filename) fs.unlink(path.join(AVATAR_DIR, user.avatar_filename)).catch(() => {})
  return { user: await publicUser(rows[0]) }
})

app.delete('/api/users/me/avatar', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query('UPDATE users SET avatar_filename=NULL,updated_at=NOW() WHERE id=$1 RETURNING *', [user.id])
  if (user.avatar_filename) fs.unlink(path.join(AVATAR_DIR, user.avatar_filename)).catch(() => {})
  return { user: await publicUser(rows[0]) }
})

app.patch('/api/users/me/badge', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const badgeKey = req.body?.badgeKey || null
  await syncAutomaticBadges(user.id)
  if (badgeKey) {
    const { rowCount } = await pool.query('SELECT 1 FROM user_badges WHERE user_id=$1 AND badge_key=$2', [user.id, badgeKey])
    if (!rowCount) return reply.code(400).send({ message: 'You have not earned this badge.' })
  }
  const { rows } = await pool.query('UPDATE users SET equipped_badge_key=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [badgeKey, user.id])
  return { user: await publicUser(rows[0]) }
})

function minecraftAccount(row) {
  if (!row) return null
  return {
    minecraftName: row.minecraft_name,
    status: row.status,
    syncMessage: row.sync_message || '',
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function bridgeToken() {
  return (process.env.MC_BRIDGE_TOKEN || process.env.MC_RCON_PASSWORD || '').trim()
}

function secureTextEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8')
  const b = Buffer.from(String(right || ''), 'utf8')
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b)
}

async function requireMinecraftBridge(req, reply) {
  const expected = bridgeToken()
  if (!expected) {
    reply.code(503).send('Minecraft bridge authentication is not configured.')
    return false
  }
  const header = String(req.headers.authorization || '')
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!secureTextEqual(provided, expected)) {
    reply.code(401).send('Unauthorized.')
    return false
  }
  return true
}

app.get('/api/minecraft/me', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query('SELECT * FROM minecraft_accounts WHERE user_id=$1', [user.id])
  return { account: minecraftAccount(rows[0]) }
})

app.post('/api/minecraft/bind', {
  config: { rateLimit: { max: 3, timeWindow: '1 day' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const minecraftName = String(req.body?.minecraftName || '').trim()
  if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftName)) {
    return reply.code(400).send({ message: 'Minecraft ID must be 3-16 letters, numbers, or underscores.' })
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO minecraft_accounts(user_id,minecraft_name,status,sync_message)
      VALUES($1,$2,'pending','Waiting for Minecraft server bridge.')
      RETURNING *
    `, [user.id, minecraftName])
    return reply.code(202).send({ account: minecraftAccount(rows[0]) })
  } catch (error) {
    if (error.code === '23505') {
      const { rows: own } = await pool.query('SELECT * FROM minecraft_accounts WHERE user_id=$1', [user.id])
      if (own[0]) return reply.code(409).send({ message: 'This Yuashie Account has already bound a Minecraft ID.' })
      return reply.code(409).send({ message: 'This Minecraft ID is already bound to another Yuashie Account.' })
    }
    throw error
  }
})

app.post('/api/minecraft/sync', {
  config: { rateLimit: { max: 6, timeWindow: '1 hour' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query('SELECT * FROM minecraft_accounts WHERE user_id=$1', [user.id])
  if (!rows[0]) return reply.code(404).send({ message: 'No Minecraft ID is bound to this account.' })
  if (rows[0].status === 'active') return { account: minecraftAccount(rows[0]) }
  const { rows: updated } = await pool.query(`
    UPDATE minecraft_accounts
    SET status='pending',sync_message='Waiting for Minecraft server bridge.',updated_at=NOW()
    WHERE user_id=$1
    RETURNING *
  `, [user.id])
  return reply.code(202).send({ account: minecraftAccount(updated[0]) })
})

// Private pull endpoint used by YuashieWhitelistBridge. The response is TSV
// rather than JSON so the Paper plugin stays dependency-free.
app.get('/api/minecraft/bridge/pending', async (req, reply) => {
  if (!await requireMinecraftBridge(req, reply)) return
  const requestedLimit = Number(req.query?.limit || 50)
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 200)) : 50
  const { rows } = await pool.query(`
    SELECT id,minecraft_name
    FROM minecraft_accounts
    WHERE status='pending'
    ORDER BY created_at ASC,id ASC
    LIMIT $1
  `, [limit])
  const body = rows.map(row => `${row.id}\t${row.minecraft_name}`).join('\n')
  return reply.type('text/plain; charset=utf-8').send(body)
})

app.post('/api/minecraft/bridge/:id/complete', async (req, reply) => {
  if (!await requireMinecraftBridge(req, reply)) return
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) return reply.code(400).type('text/plain').send('Invalid binding id.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`
      UPDATE minecraft_accounts
      SET status='active',sync_message='Whitelisted by YuashieWhitelistBridge.',synced_at=NOW(),updated_at=NOW()
      WHERE id=$1
      RETURNING user_id
    `, [id])
    if (!rows[0]) {
      await client.query('ROLLBACK')
      return reply.code(404).type('text/plain').send('Binding not found.')
    }
    await client.query(`
      INSERT INTO user_badges(user_id,badge_key,source)
      VALUES($1,'minecraft_pioneer','automatic')
      ON CONFLICT DO NOTHING
    `, [rows[0].user_id])
    await client.query('COMMIT')
    return reply.type('text/plain').send('OK')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})

app.post('/api/minecraft/bridge/:id/fail', {
  bodyLimit: 2048,
}, async (req, reply) => {
  if (!await requireMinecraftBridge(req, reply)) return
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) return reply.code(400).type('text/plain').send('Invalid binding id.')
  const message = String(req.body || 'Minecraft whitelist operation failed.').replace(/[\r\n]+/g, ' ').slice(0, 1000)
  const { rowCount } = await pool.query(`
    UPDATE minecraft_accounts
    SET status='error',sync_message=$1,updated_at=NOW()
    WHERE id=$2
  `, [message, id])
  if (!rowCount) return reply.code(404).type('text/plain').send('Binding not found.')
  return reply.type('text/plain').send('OK')
})

app.get('/api/projects/:projectId/comments', async (req, reply) => {
  const projectId = req.params.projectId
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(projectId)) return reply.code(400).send({ message: 'Invalid project id.' })
  const { rows } = await pool.query(`
    SELECT c.id,c.project_id,c.parent_id,c.content,c.status,c.created_at,c.updated_at,
           u.username,u.display_name,u.avatar_filename,u.role,
           b.key AS badge_key,b.name AS badge_name,b.emoji AS badge_emoji,b.description AS badge_description,
           rp.callsign AS radio_callsign,rp.operator_class AS radio_operator_class,rp.verification_status AS radio_verification_status
    FROM comments c
    JOIN users u ON u.id=c.user_id
    LEFT JOIN badges b ON b.key=u.equipped_badge_key
    LEFT JOIN radio_profiles rp ON rp.user_id=u.id
    WHERE c.project_id=$1
    ORDER BY c.created_at ASC,c.id ASC
    LIMIT 500
  `, [projectId])
  return { comments: rows.map(row => ({
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    content: row.status === 'deleted' ? '' : row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: publicAuthor(row),
  })) }
})

app.post('/api/projects/:projectId/comments', {
  config: { rateLimit: { max: 12, timeWindow: '1 minute' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const projectId = req.params.projectId
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(projectId)) return reply.code(400).send({ message: 'Invalid project id.' })
  const content = String(req.body?.content || '').trim()
  const parentId = req.body?.parentId || null
  if (!content || content.length > 2000) return reply.code(400).send({ message: 'Comment must be between 1 and 2000 characters.' })
  if (parentId) {
    const { rows } = await pool.query('SELECT id,parent_id,project_id,status FROM comments WHERE id=$1', [parentId])
    if (!rows[0] || rows[0].project_id !== projectId || rows[0].status !== 'visible') return reply.code(400).send({ message: 'Reply target is invalid.' })
    if (rows[0].parent_id) return reply.code(400).send({ message: 'Only one reply level is supported.' })
  }
  const { rows } = await pool.query(`
    INSERT INTO comments(project_id,user_id,parent_id,content)
    VALUES($1,$2,$3,$4)
    RETURNING id
  `, [projectId, user.id, parentId, content])
  return reply.code(201).send({ id: rows[0].id })
})

app.delete('/api/comments/:id', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query('SELECT * FROM comments WHERE id=$1', [req.params.id])
  const comment = rows[0]
  if (!comment) return reply.code(404).send({ message: 'Comment not found.' })
  if (user.role !== 'admin' && Number(comment.user_id) !== Number(user.id)) return reply.code(403).send({ message: 'Not allowed.' })
  await pool.query("UPDATE comments SET status='deleted',content='',updated_at=NOW() WHERE id=$1", [comment.id])
  return { ok: true }
})

app.post('/api/feedback', {
  config: { rateLimit: { max: 8, timeWindow: '1 hour' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { type, title, content, projectId = null, pageUrl = '' } = req.body || {}
  if (!['bug','suggestion'].includes(type)) return reply.code(400).send({ message: 'Invalid feedback type.' })
  if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) return reply.code(400).send({ message: 'Title must be 3-120 characters.' })
  if (typeof content !== 'string' || content.trim().length < 10 || content.trim().length > 4000) return reply.code(400).send({ message: 'Description must be 10-4000 characters.' })
  if (pageUrl.length > 500 || (pageUrl && !/^https?:\/\//i.test(pageUrl)) || (projectId && !/^[A-Za-z0-9_-]{1,32}$/.test(projectId))) return reply.code(400).send({ message: 'Invalid reference.' })
  const { rows } = await pool.query(`
    INSERT INTO feedback(user_id,type,title,content,project_id,page_url)
    VALUES($1,$2,$3,$4,$5,$6)
    RETURNING id,type,title,status,created_at AS "createdAt"
  `, [user.id, type, title.trim(), content.trim(), projectId || null, pageUrl.trim()])
  return reply.code(201).send({ feedback: rows[0] })
})

app.get('/api/feedback/me', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query(`
    SELECT id,type,title,content,project_id AS "projectId",page_url AS "pageUrl",status,admin_note AS "adminNote",
           reviewed_at AS "reviewedAt",created_at AS "createdAt",updated_at AS "updatedAt"
    FROM feedback WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100
  `, [user.id])
  return { feedback: rows }
})

app.get('/api/admin/feedback', async (req, reply) => {
  if (!await requireAdmin(req, reply)) return
  const { rows } = await pool.query(`
    SELECT f.id,f.type,f.title,f.content,f.project_id AS "projectId",f.page_url AS "pageUrl",f.status,
           f.admin_note AS "adminNote",f.reviewed_at AS "reviewedAt",f.created_at AS "createdAt",f.updated_at AS "updatedAt",
           u.username,u.display_name AS "displayName",u.avatar_filename
    FROM feedback f JOIN users u ON u.id=f.user_id
    ORDER BY CASE f.status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, f.created_at DESC
    LIMIT 300
  `)
  return { feedback: rows.map(row => ({ ...row, avatarUrl: avatarUrl(row.avatar_filename), avatar_filename: undefined })) }
})

app.patch('/api/admin/feedback/:id', async (req, reply) => {
  const admin = await requireAdmin(req, reply)
  if (!admin) return
  const { status, adminNote = '' } = req.body || {}
  if (!['new','reviewing','valid','fixed','adopted','rejected'].includes(status)) return reply.code(400).send({ message: 'Invalid status.' })
  if (adminNote.length > 2000) return reply.code(400).send({ message: 'Admin note is too long.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query('SELECT * FROM feedback WHERE id=$1 FOR UPDATE', [req.params.id])
    const item = rows[0]
    if (!item) { await client.query('ROLLBACK'); return reply.code(404).send({ message: 'Feedback not found.' }) }
    if (item.type === 'bug' && !['new','reviewing','valid','fixed','rejected'].includes(status)) { await client.query('ROLLBACK'); return reply.code(400).send({ message: 'Invalid bug status.' }) }
    if (item.type === 'suggestion' && !['new','reviewing','adopted','rejected'].includes(status)) { await client.query('ROLLBACK'); return reply.code(400).send({ message: 'Invalid suggestion status.' }) }

    await client.query(`
      UPDATE feedback SET status=$1,admin_note=$2,reviewed_by=$3,reviewed_at=NOW(),updated_at=NOW() WHERE id=$4
    `, [status, adminNote.trim(), admin.id, item.id])

    if (item.type === 'bug') {
      if (['valid','fixed'].includes(status)) {
        await addContribution(client, item.user_id, {
          type: 'BUG_VALID', points: 20, reason: `Valid bug report #${item.id}`,
          referenceType: 'feedback', referenceId: String(item.id),
        })
      } else {
        await removeContribution(client, item.user_id, {
          type: 'BUG_VALID', referenceType: 'feedback', referenceId: String(item.id),
        })
      }
    }
    if (item.type === 'suggestion') {
      if (status === 'adopted') {
        await addContribution(client, item.user_id, {
          type: 'SUGGESTION_ADOPTED', points: 50, reason: `Adopted suggestion #${item.id}`,
          referenceType: 'feedback', referenceId: String(item.id),
        })
      } else {
        await removeContribution(client, item.user_id, {
          type: 'SUGGESTION_ADOPTED', referenceType: 'feedback', referenceId: String(item.id),
        })
      }
    }
    await syncAutomaticBadges(item.user_id, client)
    await client.query('COMMIT')
    return { ok: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})

// ---- Project 003 · Yuashie Radio -------------------------------------------------

app.get('/api/radio/qsl-images/:filename', async (req, reply) => {
  const filename = req.params.filename
  if (!/^qsl-\d+-\d+-[a-f0-9]{12}\.(png|jpg|webp)$/.test(filename)) return reply.code(404).send({ message: 'QSL image not found.' })
  try {
    const data = await fs.readFile(path.join(QSL_DIR, filename))
    const ext = path.extname(filename).slice(1)
    reply.header('Cache-Control', 'public, max-age=86400')
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.type(ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
    return reply.send(data)
  } catch (error) {
    if (error.code === 'ENOENT') return reply.code(404).send({ message: 'QSL image not found.' })
    throw error
  }
})

app.get('/api/radio/me', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query('SELECT * FROM radio_profiles WHERE user_id=$1', [user.id])
  return { profile: radioProfile(rows[0]) }
})

app.patch('/api/radio/me', {
  config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const callsign = normalizeCallsign(req.body?.callsign)
  const operatorClass = String(req.body?.operatorClass || '').trim().toUpperCase()
  const callsignCountry = String(req.body?.callsignCountry || 'CN').trim().toUpperCase()
  if (!validCallsign(callsign)) return reply.code(400).send({ message: 'Callsign must be 3-20 letters/numbers and contain at least one letter and one number.' })
  if (!['A','B','C'].includes(operatorClass)) return reply.code(400).send({ message: 'Operator class must be A, B, or C.' })
  if (!/^[A-Z]{2}$/.test(callsignCountry)) return reply.code(400).send({ message: 'Country code must use two letters.' })
  const text = (value, max) => String(value || '').trim().slice(0, max)
  let defaultPowerW
  try { defaultPowerW = parseOptionalPower(req.body?.defaultPowerW, 'Default power') }
  catch (error) { return reply.code(400).send({ message: error.message }) }

  try {
    const { rows } = await pool.query(`
      INSERT INTO radio_profiles(user_id,callsign,operator_class,callsign_country,qth,rig,antenna,default_power_w,bio)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id) DO UPDATE SET
        callsign=EXCLUDED.callsign,operator_class=EXCLUDED.operator_class,callsign_country=EXCLUDED.callsign_country,
        qth=EXCLUDED.qth,rig=EXCLUDED.rig,antenna=EXCLUDED.antenna,default_power_w=EXCLUDED.default_power_w,bio=EXCLUDED.bio,updated_at=NOW()
      RETURNING *
    `, [user.id, callsign, operatorClass, callsignCountry, text(req.body?.qth,120), text(req.body?.rig,120), text(req.body?.antenna,160), defaultPowerW, text(req.body?.bio,500)])
    await syncAutomaticBadges(user.id)
    return { profile: radioProfile(rows[0]), user: await publicUser(user) }
  } catch (error) {
    if (error.code === '23505') return reply.code(409).send({ message: 'This callsign is already bound to another Yuashie account.' })
    throw error
  }
})

app.get('/api/radio/stations/:callsign', async (req, reply) => {
  const callsign = normalizeCallsign(req.params.callsign)
  if (!validCallsign(callsign)) return reply.code(400).send({ message: 'Invalid callsign.' })
  const { rows: profiles } = await pool.query('SELECT * FROM radio_profiles WHERE callsign=$1', [callsign])
  const profile = profiles[0]
  if (!profile) return reply.code(404).send({ message: 'Radio station not found.' })
  const { rows: users } = await pool.query('SELECT * FROM users WHERE id=$1', [profile.user_id])
  const account = users[0]
  if (!account) return reply.code(404).send({ message: 'Radio station not found.' })
  const [statsResult, recentResult] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM qso_logs WHERE user_id=$1) AS qso_count,
        (SELECT COUNT(*)::int FROM qsl_messages WHERE sender_user_id=$1) AS qsl_sent_count,
        (SELECT COUNT(*)::int FROM qsl_messages WHERE receiver_user_id=$1) AS qsl_received_count
    `, [profile.user_id]),
    pool.query(`SELECT id,my_callsign,remote_callsign,qso_date,qso_time,frequency_mhz,mode,rst_sent,rst_received,power_sent_w,power_received_w,qth,rig,antenna,'' AS notes,qsl_requested,qsl_sent,qsl_received,matched_qso_id,created_at,updated_at FROM qso_logs WHERE user_id=$1 ORDER BY qso_date DESC,qso_time DESC,id DESC LIMIT 20`, [profile.user_id]),
  ])
  return {
    profile: radioProfile(profile),
    user: await publicUser(account),
    stats: {
      qsoCount: statsResult.rows[0].qso_count,
      qslSentCount: statsResult.rows[0].qsl_sent_count,
      qslReceivedCount: statsResult.rows[0].qsl_received_count,
    },
    recentQsos: recentResult.rows.map(qsoLog),
  }
})

app.get('/api/radio/dashboard', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows: profiles } = await pool.query('SELECT * FROM radio_profiles WHERE user_id=$1', [user.id])
  const profile = profiles[0]
  if (!profile) return { profile: null, stats: { qsoCount: 0, qslSentCount: 0, qslReceivedCount: 0, unreadQslCount: 0 }, recentQsos: [], recentQsl: [] }
  const [stats, recent, qsl] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM qso_logs WHERE user_id=$1) AS qso_count,
        (SELECT COUNT(*)::int FROM qsl_messages WHERE sender_user_id=$1) AS qsl_sent_count,
        (SELECT COUNT(*)::int FROM qsl_messages WHERE receiver_user_id=$1) AS qsl_received_count,
        (SELECT COUNT(*)::int FROM qsl_messages WHERE receiver_user_id=$1 AND received_at IS NULL) AS unread_qsl_count
    `, [user.id]),
    pool.query('SELECT * FROM qso_logs WHERE user_id=$1 ORDER BY qso_date DESC,qso_time DESC,id DESC LIMIT 8', [user.id]),
    pool.query(`SELECT qm.*,u.username,u.display_name FROM qsl_messages qm JOIN users u ON u.id=qm.sender_user_id WHERE qm.receiver_user_id=$1 ORDER BY qm.sent_at DESC LIMIT 4`, [user.id]),
  ])
  return {
    profile: radioProfile(profile),
    stats: {
      qsoCount: stats.rows[0].qso_count,
      qslSentCount: stats.rows[0].qsl_sent_count,
      qslReceivedCount: stats.rows[0].qsl_received_count,
      unreadQslCount: stats.rows[0].unread_qsl_count,
    },
    recentQsos: recent.rows.map(qsoLog),
    recentQsl: qsl.rows.map(row => ({
      id: row.id,
      senderCallsign: row.sender_callsign,
      receiverCallsign: row.receiver_callsign,
      sender: { username: row.username, displayName: row.display_name },
      imageUrl: `/api/radio/qsl-images/${encodeURIComponent(row.image_filename)}`,
      snapshot: row.qso_snapshot,
      message: row.message,
      status: row.status,
      sentAt: row.sent_at,
      receivedAt: row.received_at,
    })),
  }
})

app.get('/api/radio/logs', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const query = String(req.query?.q || '').trim().toUpperCase().slice(0, 80)
  const params = [user.id]
  let where = 'user_id=$1'
  if (query) {
    params.push(`%${query}%`)
    where += ` AND (remote_callsign ILIKE $2 OR mode ILIKE $2 OR qth ILIKE $2 OR notes ILIKE $2)`
  }
  const { rows } = await pool.query(`SELECT * FROM qso_logs WHERE ${where} ORDER BY qso_date DESC,qso_time DESC,id DESC LIMIT 500`, params)
  return { logs: rows.map(qsoLog) }
})

app.get('/api/radio/logs/:id', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query('SELECT * FROM qso_logs WHERE id=$1 AND user_id=$2', [req.params.id, user.id])
  if (!rows[0]) return reply.code(404).send({ message: 'QSO log not found.' })
  return { log: qsoLog(rows[0]) }
})

app.post('/api/radio/logs', {
  config: { rateLimit: { max: 60, timeWindow: '1 hour' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows: profiles } = await pool.query('SELECT * FROM radio_profiles WHERE user_id=$1', [user.id])
  if (!profiles[0]) return reply.code(409).send({ message: 'Bind your callsign before creating a QSO log.' })
  let item
  try { item = validateQsoPayload(req.body, profiles[0]) }
  catch (error) { return reply.code(400).send({ message: error.message }) }
  const { rows } = await pool.query(`
    INSERT INTO qso_logs(user_id,my_callsign,remote_callsign,qso_date,qso_time,frequency_mhz,mode,rst_sent,rst_received,power_sent_w,power_received_w,qth,rig,antenna,notes,qsl_requested,qsl_sent,qsl_received)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING *
  `, [user.id,item.myCallsign,item.remoteCallsign,item.date,item.time,item.frequencyMHz,item.mode,item.rstSent,item.rstReceived,item.powerSentW,item.powerReceivedW,item.qth,item.rig,item.antenna,item.notes,item.qslRequested,item.qslSent,item.qslReceived])
  return reply.code(201).send({ log: qsoLog(rows[0]) })
})

app.patch('/api/radio/logs/:id', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows: profiles } = await pool.query('SELECT * FROM radio_profiles WHERE user_id=$1', [user.id])
  if (!profiles[0]) return reply.code(409).send({ message: 'Bind your callsign first.' })
  const { rowCount } = await pool.query('SELECT 1 FROM qso_logs WHERE id=$1 AND user_id=$2', [req.params.id,user.id])
  if (!rowCount) return reply.code(404).send({ message: 'QSO log not found.' })
  let item
  try { item = validateQsoPayload(req.body, profiles[0]) }
  catch (error) { return reply.code(400).send({ message: error.message }) }
  const { rows } = await pool.query(`
    UPDATE qso_logs SET my_callsign=$1,remote_callsign=$2,qso_date=$3,qso_time=$4,frequency_mhz=$5,mode=$6,rst_sent=$7,rst_received=$8,power_sent_w=$9,power_received_w=$10,qth=$11,rig=$12,antenna=$13,notes=$14,qsl_requested=$15,qsl_sent=$16,qsl_received=$17,updated_at=NOW()
    WHERE id=$18 AND user_id=$19 RETURNING *
  `, [item.myCallsign,item.remoteCallsign,item.date,item.time,item.frequencyMHz,item.mode,item.rstSent,item.rstReceived,item.powerSentW,item.powerReceivedW,item.qth,item.rig,item.antenna,item.notes,item.qslRequested,item.qslSent,item.qslReceived,req.params.id,user.id])
  return { log: qsoLog(rows[0]) }
})

app.delete('/api/radio/logs/:id', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rowCount } = await pool.query('DELETE FROM qso_logs WHERE id=$1 AND user_id=$2', [req.params.id,user.id])
  if (!rowCount) return reply.code(404).send({ message: 'QSO log not found.' })
  return { ok: true }
})

app.get('/api/radio/qsl-templates', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query('SELECT * FROM qsl_templates WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC', [user.id])
  return { templates: rows.map(qslTemplate) }
})

app.post('/api/radio/qsl-templates', {
  bodyLimit: 7 * 1024 * 1024,
  config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const name = String(req.body?.name || '').trim()
  if (!name || name.length > 80) return reply.code(400).send({ message: 'QSL name must be between 1 and 80 characters.' })
  let parsed
  try { parsed = parseQslDataUrl(req.body?.dataUrl) }
  catch (error) { return reply.code(400).send({ message: error.message }) }
  const filename = `qsl-${user.id}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${parsed.ext}`
  await fs.writeFile(path.join(QSL_DIR, filename), parsed.buffer, { flag: 'wx' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: countRows } = await client.query('SELECT COUNT(*)::int AS count FROM qsl_templates WHERE user_id=$1', [user.id])
    const makeDefault = Boolean(req.body?.isDefault) || countRows[0].count === 0
    if (makeDefault) await client.query('UPDATE qsl_templates SET is_default=FALSE,updated_at=NOW() WHERE user_id=$1', [user.id])
    const { rows } = await client.query('INSERT INTO qsl_templates(user_id,name,image_filename,is_default) VALUES($1,$2,$3,$4) RETURNING *', [user.id,name,filename,makeDefault])
    await client.query('COMMIT')
    return reply.code(201).send({ template: qslTemplate(rows[0]) })
  } catch (error) {
    await client.query('ROLLBACK')
    fs.unlink(path.join(QSL_DIR, filename)).catch(() => {})
    throw error
  } finally { client.release() }
})

app.patch('/api/radio/qsl-templates/:id/default', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query('SELECT * FROM qsl_templates WHERE id=$1 AND user_id=$2 FOR UPDATE', [req.params.id,user.id])
    if (!rows[0]) { await client.query('ROLLBACK'); return reply.code(404).send({ message: 'QSL template not found.' }) }
    await client.query('UPDATE qsl_templates SET is_default=FALSE,updated_at=NOW() WHERE user_id=$1', [user.id])
    const { rows: updated } = await client.query('UPDATE qsl_templates SET is_default=TRUE,updated_at=NOW() WHERE id=$1 RETURNING *', [req.params.id])
    await client.query('COMMIT')
    return { template: qslTemplate(updated[0]) }
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
})

app.delete('/api/radio/qsl-templates/:id', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query('DELETE FROM qsl_templates WHERE id=$1 AND user_id=$2 RETURNING image_filename,is_default', [req.params.id,user.id])
  const item = rows[0]
  if (!item) return reply.code(404).send({ message: 'QSL template not found.' })
  const { rows: refs } = await pool.query('SELECT COUNT(*)::int AS count FROM qsl_messages WHERE image_filename=$1', [item.image_filename])
  if (!refs[0].count) fs.unlink(path.join(QSL_DIR,item.image_filename)).catch(() => {})
  if (item.is_default) await pool.query(`UPDATE qsl_templates SET is_default=TRUE,updated_at=NOW() WHERE id=(SELECT id FROM qsl_templates WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1)`, [user.id])
  return { ok: true }
})

function qslMessage(row) {
  return {
    id: row.id,
    senderCallsign: row.sender_callsign,
    receiverCallsign: row.receiver_callsign,
    sender: row.sender_username ? { username: row.sender_username, displayName: row.sender_display_name } : null,
    receiver: row.receiver_username ? { username: row.receiver_username, displayName: row.receiver_display_name } : null,
    imageUrl: `/api/radio/qsl-images/${encodeURIComponent(row.image_filename)}`,
    snapshot: row.qso_snapshot,
    message: row.message,
    status: row.status,
    sentAt: row.sent_at,
    receivedAt: row.received_at,
    confirmedAt: row.confirmed_at,
  }
}

app.post('/api/radio/qsl-messages', {
  config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
}, async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const qsoId = Number(req.body?.qsoId)
  const templateId = Number(req.body?.templateId)
  const message = String(req.body?.message || '').trim()
  if (!Number.isSafeInteger(qsoId) || !Number.isSafeInteger(templateId)) return reply.code(400).send({ message: 'Invalid QSO or QSL template.' })
  if (message.length > 300) return reply.code(400).send({ message: 'QSL message is too long.' })
  const { rows: qsos } = await pool.query('SELECT * FROM qso_logs WHERE id=$1 AND user_id=$2', [qsoId,user.id])
  if (!qsos[0]) return reply.code(404).send({ message: 'QSO log not found.' })
  const { rows: templates } = await pool.query('SELECT * FROM qsl_templates WHERE id=$1 AND user_id=$2', [templateId,user.id])
  if (!templates[0]) return reply.code(404).send({ message: 'QSL template not found.' })
  const { rows: receivers } = await pool.query('SELECT rp.*,u.username,u.display_name FROM radio_profiles rp JOIN users u ON u.id=rp.user_id WHERE rp.callsign=$1', [qsos[0].remote_callsign])
  if (!receivers[0]) return reply.code(404).send({ message: 'The remote callsign is not bound to a Yuashie user, so an electronic QSL cannot be delivered in-site.' })
  if (receivers[0].user_id === user.id) return reply.code(400).send({ message: 'You cannot send a QSL to yourself.' })
  const snapshot = qsoLog(qsos[0])
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`
      INSERT INTO qsl_messages(sender_user_id,receiver_user_id,qso_id,qsl_template_id,sender_callsign,receiver_callsign,image_filename,qso_snapshot,message)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
      RETURNING *
    `, [user.id,receivers[0].user_id,qsoId,templateId,qsos[0].my_callsign,qsos[0].remote_callsign,templates[0].image_filename,JSON.stringify(snapshot),message])
    await client.query('UPDATE qso_logs SET qsl_sent=TRUE,updated_at=NOW() WHERE id=$1', [qsoId])
    await client.query('COMMIT')
    return reply.code(201).send({ message: qslMessage(rows[0]) })
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') return reply.code(409).send({ message: 'A QSL has already been sent for this QSO.' })
    throw error
  } finally { client.release() }
})

app.get('/api/radio/qsl-inbox', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query(`
    SELECT qm.*,u.username AS sender_username,u.display_name AS sender_display_name
    FROM qsl_messages qm JOIN users u ON u.id=qm.sender_user_id
    WHERE qm.receiver_user_id=$1 ORDER BY qm.sent_at DESC LIMIT 200
  `, [user.id])
  return { messages: rows.map(qslMessage) }
})

app.get('/api/radio/qsl-outbox', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query(`
    SELECT qm.*,u.username AS receiver_username,u.display_name AS receiver_display_name
    FROM qsl_messages qm JOIN users u ON u.id=qm.receiver_user_id
    WHERE qm.sender_user_id=$1 ORDER BY qm.sent_at DESC LIMIT 200
  `, [user.id])
  return { messages: rows.map(qslMessage) }
})

app.patch('/api/radio/qsl-messages/:id/received', async (req, reply) => {
  const user = await requireUser(req, reply)
  if (!user) return
  const { rows } = await pool.query(`
    UPDATE qsl_messages SET status=CASE WHEN status='sent' THEN 'received' ELSE status END,received_at=COALESCE(received_at,NOW())
    WHERE id=$1 AND receiver_user_id=$2 RETURNING *
  `, [req.params.id,user.id])
  if (!rows[0]) return reply.code(404).send({ message: 'QSL message not found.' })
  return { message: qslMessage(rows[0]) }
})

// ---- End Project 003 · Yuashie Radio ---------------------------------------------

app.post('/api/admin/users/:username/badges/:badgeKey', async (req, reply) => {
  if (!await requireAdmin(req, reply)) return
  const { rows: users } = await pool.query('SELECT * FROM users WHERE lower(username)=lower($1)', [req.params.username])
  if (!users[0]) return reply.code(404).send({ message: 'User not found.' })
  const { rowCount: badgeExists } = await pool.query('SELECT 1 FROM badges WHERE key=$1', [req.params.badgeKey])
  if (!badgeExists) return reply.code(404).send({ message: 'Badge not found.' })
  await pool.query(`INSERT INTO user_badges(user_id,badge_key,source) VALUES($1,$2,'admin') ON CONFLICT DO NOTHING`, [users[0].id, req.params.badgeKey])
  return { user: await publicUser(users[0]) }
})

app.delete('/api/admin/users/:username/badges/:badgeKey', async (req, reply) => {
  if (!await requireAdmin(req, reply)) return
  const { rows: users } = await pool.query('SELECT * FROM users WHERE lower(username)=lower($1)', [req.params.username])
  if (!users[0]) return reply.code(404).send({ message: 'User not found.' })
  await pool.query('DELETE FROM user_badges WHERE user_id=$1 AND badge_key=$2', [users[0].id, req.params.badgeKey])
  await pool.query('UPDATE users SET equipped_badge_key=NULL WHERE id=$1 AND equipped_badge_key=$2', [users[0].id, req.params.badgeKey])
  return { user: await publicUser(users[0]) }
})

app.setErrorHandler((error, req, reply) => {
  req.log.error(error)
  reply.code(500).send({ message: 'Internal server error.' })
})

await app.listen({ port: PORT, host: '127.0.0.1' })
