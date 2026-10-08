import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { validPath, validKeys, validPreferences, csrfToken, safeEqual } from '../../server/src/cloud-sync.js'

test('sync validation rejects unsafe paths, forged preference fields and oversized import', () => {
 for (const p of ['https://evil.test','//evil.test','/../admin','/x?script=1','/x<script>']) assert.equal(validPath(p), false)
 assert.equal(validPath('/projects/001'),true)
 assert.equal(validPreferences({ user_id: 2, language: 'en' }),false)
 assert.equal(validPreferences({ language: 'xx' }),false)
 assert.equal(validPreferences({ language: 'ja', theme: 'light' }),true)
 assert.equal(validKeys(Array(1001).fill('reply:1')),false)
 assert.equal(validKeys(['reply:1','badge:founding_member:2026-01-01T00:00:00.000Z']),true)
 assert.equal(safeEqual(csrfToken('session-A','secret'),csrfToken('session-B','secret')),false)
 assert.equal(safeEqual('aa','éé'),false)
})

test('PostgreSQL migration and full API: independent sessions, CSRF, isolation, imports and real notifications', async t => {
 const db = new PGlite()
 for (const file of (await readdir(new URL('../../server/sql/',import.meta.url))).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(`../../server/sql/${file}`, import.meta.url),'utf8'))
 await db.exec(await readFile(new URL('../../server/sql/006_cloud_sync.sql',import.meta.url),'utf8')) // rerunnable
 process.env.USER_CONTENT_DIR = await mkdtemp(path.join(tmpdir(),'netweb-sync-test-'))
 process.env.CSRF_SECRET = 'test-only-secret-with-at-least-32-characters'
 process.env.SITE_ORIGIN = 'https://yuashie.cn'
 process.env.NODE_ENV = 'production'
 const { app, pool } = await import('../../server/src/index.js')
 const query = async (sql,values) => { const r = await db.query(sql,values); return { ...r, rowCount: r.affectedRows ?? r.rows.length } }
 pool.query = query
 pool.connect = async () => ({ query, release() {} })
 t.after(async () => { await app.close(); await pool.end(); await db.close() })
 const origin = 'https://yuashie.cn'
 async function send(method,url,payload,cookie,extra = {}) {
   const headers = { origin, ...extra }
   if (cookie) { headers.cookie = cookie; headers['x-csrf-token'] ||= csrfToken(cookie.split('=')[1],process.env.CSRF_SECRET) }
   const response = await app.inject({ method,url,payload,headers })
   return response
 }
 const register = await send('POST','/api/auth/register',{ username:'user_a', email:'a@example.test',password:'testPassword99',displayName:'User A' })
 assert.equal(register.statusCode,201,register.body)
 const c1 = register.headers['set-cookie'].split(';')[0]
 assert.match(register.headers['set-cookie'],/HttpOnly/); assert.match(register.headers['set-cookie'],/Secure/); assert.match(register.headers['set-cookie'],/SameSite=Lax/)
 const userA = register.json().user.id
 const login = await send('POST','/api/auth/login',{ email:'a@example.test',password:'testPassword99' })
 const c2 = login.headers['set-cookie'].split(';')[0]
 assert.notEqual(c1,c2)
 const b = await send('POST','/api/auth/register',{ username:'user_b',email:'b@example.test',password:'testPassword99',displayName:'User B' })
 const cb = b.headers['set-cookie'].split(';')[0], userB = b.json().user.id
 assert.equal((await send('GET','/api/sync')).statusCode,401)
 const noOrigin = await app.inject({ method:'PUT',url:'/api/sync/favorites',headers:{cookie:c1},payload:{path:'/radio',saved:true} })
 assert.equal(noOrigin.statusCode,403)
 assert.equal((await send('GET','/api/auth/csrf',undefined,c1)).headers['cache-control'],'no-store')
 assert.equal((await send('PUT','/api/sync/favorites',{ path:'/projects/001',saved:true },c1,{origin:'https://evil.test'})).statusCode,403)
 assert.equal((await send('PUT','/api/sync/favorites',{ path:'/projects/001',saved:true },c1,{'x-csrf-token':'wrong'})).statusCode,403)
 assert.equal((await send('PUT','/api/sync/favorites',{ path:'/projects/001',saved:true },c1,{'x-sync-user':String(userB)})).statusCode,409)
 assert.equal((await send('PUT','/api/sync/favorites',{ path:'/projects/001',saved:true },c1)).statusCode,200)
 assert.deepEqual((await send('GET','/api/sync',undefined,c2)).json().favorites,['/projects/001'])
 assert.deepEqual((await send('GET','/api/sync',undefined,cb)).json().favorites,[])
 await send('PATCH','/api/sync/preferences',{ language:'ja',theme:'light' },c1)
 assert.equal((await send('POST','/api/sync/import',{favorites:['//evil.test']},c1)).statusCode,400)
 const imported = { favorites:['/projects/001','/radio'],reads:['reply:999'],preferences:{language:'en',theme:'dark'} }
 assert.equal((await send('POST','/api/sync/import',imported,c2)).statusCode,200)
 assert.equal((await send('POST','/api/sync/import',imported,c2)).statusCode,200)
 const state = (await send('GET','/api/sync',undefined,c1)).json()
 assert.deepEqual(state.favorites,['/projects/001','/radio']); assert.deepEqual(state.preferences,{ language:'ja',theme:'light' })
 const parent = await db.query("INSERT INTO comments(project_id,user_id,content) VALUES('001',$1,'parent') RETURNING id",[userA])
 const reply = await db.query("INSERT INTO comments(project_id,user_id,parent_id,content) VALUES('001',$1,$2,'actual reply') RETURNING id",[userB,parent.rows[0].id])
 await db.query("INSERT INTO comments(project_id,user_id,content) VALUES('site-broadcast',$1,$2)",[userB,'__YUASHIE_BROADCAST_V1__\n'+JSON.stringify({title:'Not admin',body:'ignore'})])
 await db.query("UPDATE users SET role='admin' WHERE id=$1",[userB])
 await db.query("INSERT INTO comments(project_id,user_id,content) VALUES('site-broadcast',$1,$2)",[userB,'__YUASHIE_BROADCAST_V1__\n'+JSON.stringify({title:'Actual notice',body:'real notice'})])
 const notices = (await send('GET','/api/notifications',undefined,c1)).json().notifications
 assert.ok(notices.some(n => n.key === `reply:${reply.rows[0].id}` && n.content === 'actual reply'))
 assert.ok(notices.some(n => n.title === 'Actual notice'))
 const key = `reply:${reply.rows[0].id}`
 await send('PUT','/api/notifications/read',{ keys:[key] },c1)
 assert.ok((await send('GET','/api/notifications',undefined,c2)).json().notifications.find(n => n.key === key).read)
 assert.ok(!(await send('GET','/api/notifications',undefined,cb)).json().notifications.some(n => n.key === key))
 await db.query("UPDATE comments SET status='deleted' WHERE id=$1",[reply.rows[0].id])
 assert.ok(!(await send('GET','/api/notifications',undefined,c1)).json().notifications.some(n => n.key === key))
 await db.exec(await readFile(new URL('../../server/sql/006_cloud_sync.sql',import.meta.url),'utf8'))
 assert.deepEqual((await send('GET','/api/sync',undefined,c1)).json().favorites,['/projects/001','/radio'])
 const devices = (await send('GET','/api/auth/sessions',undefined,c1)).json().sessions
 assert.equal(devices.length,2)
 const current = devices.find(s => s.current)
 await send('DELETE',`/api/auth/sessions/${current.id}`,undefined,cb)
 assert.equal((await send('GET','/api/auth/me',undefined,c1)).statusCode,200)
 await send('DELETE',`/api/auth/sessions/${current.id}`,undefined,c2)
 assert.equal((await send('GET','/api/auth/me',undefined,c1)).statusCode,401)
 assert.equal((await send('GET','/api/auth/me',undefined,c2)).statusCode,200)
 await send('POST','/api/auth/logout',undefined,c2)
 assert.equal((await send('GET','/api/auth/me',undefined,c2)).statusCode,401)
 assert.equal((await send('POST','/api/minecraft/bridge/1/fail',{message:'test'})).statusCode,503)
})
