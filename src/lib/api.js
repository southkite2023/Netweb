const API_BASE = '/api'

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed')
  return data
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
