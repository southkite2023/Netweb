import { reactive } from 'vue'
import { api } from './api'

export const auth = reactive({ user: null, ready: false })

export async function loadSession() {
  try { auth.user = (await api.me()).user } catch { auth.user = null }
  finally { auth.ready = true }
}

export async function signOut() {
  await api.logout()
  auth.user = null
}
