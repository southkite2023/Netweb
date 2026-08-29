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
const AVATAR_MAX_BYTES = 512 * 1024

await fs.mkdir(AVATAR_DIR, { recursive: true })
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

app.get('/api/health', async () => ({ ok: true, version: '0.2.4' }))

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

app.get('/api/projects/:projectId/comments', async (req, reply) => {
  const projectId = req.params.projectId
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(projectId)) return reply.code(400).send({ message: 'Invalid project id.' })
  const { rows } = await pool.query(`
    SELECT c.id,c.project_id,c.parent_id,c.content,c.status,c.created_at,c.updated_at,
           u.username,u.display_name,u.avatar_filename,u.role,
           b.key AS badge_key,b.name AS badge_name,b.emoji AS badge_emoji,b.description AS badge_description
    FROM comments c
    JOIN users u ON u.id=c.user_id
    LEFT JOIN badges b ON b.key=u.equipped_badge_key
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
