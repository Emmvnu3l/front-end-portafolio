const AUTH_STORAGE_KEY = 'ds-auth-user'
const THEME_STORAGE_KEY = 'ds-theme'

function getInitialTheme() {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  const prefersDark =
    window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  return prefersDark ? 'dark' : 'light'
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
}

function getStoredUser() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function setError(message) {
  const el = document.getElementById('login-error')
  if (!message) {
    el.classList.add('d-none')
    el.textContent = ''
    return
  }
  el.textContent = message
  el.classList.remove('d-none')
}

function setLoading(loading) {
  const btn = document.getElementById('login-submit')
  btn.disabled = loading
  btn.textContent = loading ? 'Ingresando…' : 'Entrar'
}

function buildIdentityFromEmail(email) {
  const local = String(email ?? '').split('@')[0] || 'usuario'
  const clean = local.replace(/[._-]+/g, ' ').trim()
  const parts = clean.split(/\s+/).filter(Boolean)

  const name = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return {
    name: name || 'Usuario',
    initials: initials || 'U',
  }
}

function signIn({ email }) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  const identity = buildIdentityFromEmail(normalizedEmail)
  const user = {
    id: 'u_1',
    name: identity.name,
    email: normalizedEmail,
    initials: identity.initials,
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  return user
}

function goToDashboard() {
  window.location.href = '../dashboard/dashboard.html'
}

function parseJwtPayload(token) {
  try {
    const payloadPart = String(token ?? '').split('.')[1]
    if (!payloadPart) return null
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

function signInWithGoogleCredential(credential) {
  const payload = parseJwtPayload(credential)
  const email = payload?.email

  if (!email) {
    setError('No se pudo validar la cuenta de Google')
    return
  }

  const user = signIn({ email })
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      ...user,
      name: payload?.name || user.name,
      picture: payload?.picture || null,
      provider: 'google',
    }),
  )
  goToDashboard()
}

window.handleCredentialResponse = function handleCredentialResponse(response) {
  setError(null)
  const credential = response?.credential

  if (!credential) {
    setError('No se recibió una credencial válida de Google')
    return
  }

  signInWithGoogleCredential(credential)
}

document.addEventListener('DOMContentLoaded', () => {
  setTheme(getInitialTheme())

  const existing = getStoredUser()
  if (existing) goToDashboard()

  const form = document.getElementById('login-form')
  const emailInput = document.getElementById('email')
  const passInput = document.getElementById('password')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    setError(null)

    const email = emailInput.value
    const password = passInput.value

    if (!String(email ?? '').trim() || !String(password ?? '').trim()) {
      setError('Credenciales inválidas')
      return
    }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 250))
    signIn({ email, password })
    goToDashboard()
  })
})
