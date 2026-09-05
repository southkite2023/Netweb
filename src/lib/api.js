const API_BASE = '/api'

export async function request(path, options = {}) {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'zh-CN'
  const messages = lang.startsWith('en')
    ? { timeout: 'Request timed out. If you submitted something, check its status before trying again.', network: 'Could not connect. Check your network and try again.', invalid: 'The server returned an unexpected response. Please try again later.' }
    : lang.startsWith('ja')
      ? { timeout: '応答がタイムアウトしました。送信した場合は、再試行の前に結果を確認してください。', network: '接続できません。ネットワークを確認してください。', invalid: 'サーバーの応答を読み取れません。しばらくして再試行してください。' }
      : { timeout: '请求超时。若刚刚提交了内容，请先查看结果再重试。', network: '暂时无法连接，请检查网络后重试。', invalid: '服务器返回了无法识别的内容，请稍后再试。' }
  const headers = new Headers(options.headers || {})
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const controller = new AbortController()
  let timedOut = false
  const cancel = () => controller.abort(options.signal?.reason)
  if (options.signal?.aborted) cancel()
  else options.signal?.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, 15000)
  try {
    const response = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...options, headers, signal: controller.signal })
    if (response.status === 204) return {}
    const text = await response.text()
    let data
    try { data = JSON.parse(text) } catch { throw new Error(messages.invalid) }
    if (!data || typeof data !== 'object') throw new Error(messages.invalid)
    if (!response.ok) {
      const error = new Error(typeof data.message === 'string' ? data.message : `${messages.invalid} (${response.status})`)
      error.status = response.status
      throw error
    }
    return data
  } catch (error) {
    if (timedOut) throw new Error(messages.timeout)
    if (error instanceof TypeError) throw new Error(messages.network)
    throw error
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', cancel)
  }
}

export const api = {
  me: () => request('/auth/me'),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateProfile: (payload) => request('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadAvatar: (dataUrl) => request('/users/me/avatar', { method: 'PATCH', body: JSON.stringify({ dataUrl }) }),
  removeAvatar: () => request('/users/me/avatar', { method: 'DELETE' }),
  equipBadge: (badgeKey) => request('/users/me/badge', { method: 'PATCH', body: JSON.stringify({ badgeKey }) }),
  badges: () => request('/badges'),
  user: (username) => request(`/users/${encodeURIComponent(username)}`),
  contributions: (username) => request(`/users/${encodeURIComponent(username)}/contributions`),
  comments: (projectId) => request(`/projects/${encodeURIComponent(projectId)}/comments`),
  postComment: (projectId, payload) => request(`/projects/${encodeURIComponent(projectId)}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteComment: (id) => request(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  submitFeedback: (payload) => request('/feedback', { method: 'POST', body: JSON.stringify(payload) }),
  myFeedback: () => request('/feedback/me'),
  adminFeedback: () => request('/admin/feedback'),
  reviewFeedback: (id, payload) => request(`/admin/feedback/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  minecraftAccount: () => request('/minecraft/me'),
  bindMinecraft: (minecraftName) => request('/minecraft/bind', { method: 'POST', body: JSON.stringify({ minecraftName }) }),
  syncMinecraft: () => request('/minecraft/sync', { method: 'POST' }),
  radioMe: () => request('/radio/me'),
  updateRadioProfile: (payload) => request('/radio/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  radioStation: (callsign) => request(`/radio/stations/${encodeURIComponent(callsign)}`),
  radioDashboard: () => request('/radio/dashboard'),
  radioLogs: (q = '') => request(`/radio/logs${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  radioLog: (id) => request(`/radio/logs/${encodeURIComponent(id)}`),
  createRadioLog: (payload) => request('/radio/logs', { method: 'POST', body: JSON.stringify(payload) }),
  updateRadioLog: (id, payload) => request(`/radio/logs/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteRadioLog: (id) => request(`/radio/logs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  qslTemplates: () => request('/radio/qsl-templates'),
  uploadQslTemplate: (payload) => request('/radio/qsl-templates', { method: 'POST', body: JSON.stringify(payload) }),
  setDefaultQsl: (id) => request(`/radio/qsl-templates/${encodeURIComponent(id)}/default`, { method: 'PATCH' }),
  deleteQslTemplate: (id) => request(`/radio/qsl-templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  sendQsl: (payload) => request('/radio/qsl-messages', { method: 'POST', body: JSON.stringify(payload) }),
  qslInbox: () => request('/radio/qsl-inbox'),
  qslOutbox: () => request('/radio/qsl-outbox'),
  markQslReceived: (id) => request(`/radio/qsl-messages/${encodeURIComponent(id)}/received`, { method: 'PATCH' }),
}
