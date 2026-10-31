// Private Google OAuth transport. Never expose this as a general-purpose proxy.
const routes = {
  '/token': { method: 'POST', upstream: 'https://oauth2.googleapis.com/token' },
  '/certs': { method: 'GET', upstream: 'https://www.googleapis.com/oauth2/v3/certs' },
}
const reply = (status, message) => new Response(JSON.stringify({ error: message }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})
export default {
  async fetch(request, env) {
    env = { ALLOWED_IP: '47.109.147.60', GOOGLE_CLIENT_ID: '573714632760-ofb8pkla296tgmkj3ed9s3iiik3gcfl5.apps.googleusercontent.com', ...env }
    // CF-Connecting-IP is supplied by Cloudflare, not trusted from a direct client.
    if (request.headers.get('CF-Connecting-IP') !== env.ALLOWED_IP) return reply(403, 'forbidden')
    const url = new URL(request.url), route = routes[url.pathname]
    if (!route || url.search) return reply(404, 'not_found')
    if (request.method !== route.method) return reply(405, 'method_not_allowed')
    let body
    if (route.method === 'POST') {
      if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/x-www-form-urlencoded') return reply(415, 'unsupported_media_type')
      if (Number(request.headers.get('Content-Length') || 0) > 16384) return reply(413, 'request_too_large')
      const reader = request.body?.getReader(), chunks = []
      let size = 0
      if (!reader) return reply(400, 'invalid_request')
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 16384) { await reader.cancel(); return reply(413, 'request_too_large') }
        chunks.push(value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      body = new TextDecoder().decode(bytes)
      const form = new URLSearchParams(body)
      const allowed = new Set(['grant_type','code','client_id','client_secret','redirect_uri','code_verifier'])
      if ([...form.keys()].some(k => !allowed.has(k) || form.getAll(k).length !== 1)
          || form.get('grant_type') !== 'authorization_code'
          || form.get('client_id') !== env.GOOGLE_CLIENT_ID
          || form.get('redirect_uri') !== 'https://yuashie.cn/api/auth/oauth/google/callback'
          || !form.get('code') || !form.get('client_secret') || !form.get('code_verifier')) return reply(400, 'invalid_request')
    }
    try {
      const upstream = await fetch(route.upstream, {
        method: route.method, redirect: 'manual', signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        ...(body ? { body } : {}),
      })
      if (upstream.status >= 300 && upstream.status < 400) return reply(502, 'upstream_redirect_rejected')
      const contentType = upstream.headers.get('Content-Type') || ''
      if (!contentType.includes('application/json')) return reply(502, 'invalid_upstream_response')
      return new Response(upstream.body, { status: upstream.status, headers: {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } })
    } catch { return reply(502, 'upstream_unavailable') }
  },
}
