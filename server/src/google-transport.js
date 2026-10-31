// Route only Google's two server-side authentication endpoints through our private relay.
const routes = new Map([
  ['https://oauth2.googleapis.com/token', '/token'],
  ['https://www.googleapis.com/oauth2/v3/certs', '/certs'],
])
export function createGoogleTransport(env = process.env, transport = globalThis.fetch) {
  return async function googleFetch(input, options = {}) {
    const original = input instanceof Request ? input.url : String(input)
    const relayPath = routes.get(original)
    const configured = env.GOOGLE_AUTH_RELAY_ORIGIN
    if (!configured || !relayPath) return transport(input, options)
    // Fail closed: no user-controlled upstream, credentials, paths, query strings or redirects.
    if (configured !== 'https://google-auth.yuashie.com') throw new Error('Invalid Google auth relay origin')
    return transport(configured + relayPath, { ...options, redirect: 'error' })
  }
}
export const googleFetch = createGoogleTransport()
