import { GOOGLE_CLIENT_ID } from './config'

type CredentialResponse = { credential: string }

type GoogleId = {
  initialize(options: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    use_fedcm_for_button?: boolean
  }): void
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void
  disableAutoSelect(): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

const STORAGE_KEY = 'ragistone-admin-token'
let gisPromise: Promise<GoogleId> | null = null

/** Loads Google Identity Services once. */
export function loadGoogle(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in failed to load.')))
      script.onerror = () => {
        gisPromise = null
        reject(new Error('Google sign-in failed to load. Check your connection.'))
      }
      document.head.appendChild(script)
    })
  }
  return gisPromise
}

export function renderGoogleButton(el: HTMLElement, onToken: (token: string) => void): Promise<void> {
  return loadGoogle().then((gid) => {
    gid.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => onToken(r.credential), auto_select: false, cancel_on_tap_outside: true })
    el.innerHTML = ''
    gid.renderButton(el, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', logo_alignment: 'left', width: Math.min(300, el.clientWidth || 300) })
  })
}

type TokenClaims = { email?: string; exp?: number; given_name?: string; name?: string }

/** Reads the token's claims for display and expiry only; the server does the real check. */
export function readClaims(token: string): TokenClaims {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '='))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export function isExpired(token: string, marginSeconds = 60): boolean {
  const exp = readClaims(token).exp
  return !exp || exp - marginSeconds <= Date.now() / 1000
}

export function saveToken(token: string) {
  try { sessionStorage.setItem(STORAGE_KEY, token) } catch { /* private mode: stays in memory only */ }
}

export function loadToken(): string | null {
  try {
    const t = sessionStorage.getItem(STORAGE_KEY)
    return t && !isExpired(t) ? t : null
  } catch {
    return null
  }
}

export function clearToken() {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  window.google?.accounts?.id?.disableAutoSelect()
}
