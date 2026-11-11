import { useCallback, useEffect, useRef, useState } from 'react'
import { ChartColumn, ClipboardList, FileText, HandCoins, LoaderCircle, Lock, LogOut, Package, ReceiptText, RefreshCw, ShieldCheck, ShoppingCart, Users, Wallet } from 'lucide-react'
import { ApiError, callApi } from './api'
import { clearToken, loadToken, readClaims, renderGoogleButton, saveToken } from './auth'
import { API_URL, GOOGLE_CLIENT_ID } from './config'
import { DocumentsPanel } from './DocumentsPanel'
import { ExpensesPanel } from './ExpensesPanel'
import { MonthStrip, PartiesPanel, PaymentsPanel, ProductsPanel, PurchasesPanel, ReportsPanel, SalesPanel } from './ShopPanels'
import { SourcingPanel } from './SourcingPanel'

type User = { email: string; name: string }
type State =
  | { kind: 'signed-out'; notice?: string }
  | { kind: 'checking' }
  | { kind: 'ready'; token: string; user: User }
  | { kind: 'denied'; message: string }
  | { kind: 'error'; message: string; token: string }

type SecurityReport = { checked: number; owner: string; sharedWith: string[]; linkShared: { path: string; access: string }[]; unexpectedPeople: string[]; allPrivate: boolean }

const ready = [
  { id: 'documents' as const, title: 'Documents', note: 'GST, MSME, FSSAI, plans, bills and more, kept in Drive.', icon: FileText },
  { id: 'sourcing' as const, title: 'Sourcing', note: 'Products we may buy, with India and factory prices.', icon: ClipboardList },
  { id: 'expenses' as const, title: 'Expenses', note: 'Who paid what, and who owes whom.', icon: Wallet },
  { id: 'parties' as const, title: 'Parties', note: 'Suppliers and customers in one list.', icon: Users },
  { id: 'products' as const, title: 'Products & stock', note: 'Prices, GST, HSN and low-stock alerts.', icon: Package },
  { id: 'purchases' as const, title: 'Purchases', note: 'Bills from suppliers; stock goes up.', icon: ShoppingCart },
  { id: 'sales' as const, title: 'Sales & invoices', note: 'GST invoices, quotations and credit notes.', icon: ReceiptText },
  { id: 'payments' as const, title: 'Payments', note: "You'll get / you'll give, with reminders.", icon: HandCoins },
  { id: 'reports' as const, title: 'Reports', note: 'Monthly totals and GST summary for your CA.', icon: ChartColumn },
]

function BrandMark() {
  return (
    <a className="brand brand--small" href="/" aria-label="Ragistone home">
      <span className="brand__seal" aria-hidden="true">
        <svg viewBox="0 0 42 42" fill="none">
          <path d="M11 29.5c7.6-1.1 15.5-7.7 18-18.5-7.1 1.6-14.1 7.7-18 18.5Z" />
          <path d="M13 31c4.1-5 9-8.5 15.4-11.7M25.3 11.8c2.1 1.5 3.8 3.4 5 5.6" />
          <path d="M10.5 32.5h22" />
        </svg>
      </span>
      <span className="brand__word">RAGISTONE</span>
    </a>
  )
}

function SignInCard({ notice, onToken }: { notice?: string; onToken: (token: string) => void }) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState('')
  const configured = Boolean(GOOGLE_CLIENT_ID && API_URL)

  useEffect(() => {
    if (!configured || !buttonRef.current) return
    renderGoogleButton(buttonRef.current, onToken).catch((err: Error) => setLoadError(err.message))
  }, [configured, onToken])

  return (
    <section className="admin-card admin-card--narrow" aria-labelledby="signin-heading">
      <p className="eyebrow"><span className="eyebrow__line" /> Owners only</p>
      <h1 id="signin-heading">Ragistone <em>admin.</em></h1>
      <p className="admin-card__copy">Sign in with your Google account. Only the three Ragistone owners can get in.</p>
      {notice && <p className="admin-notice">{notice}</p>}
      {configured
        ? <div className="admin-google" ref={buttonRef}><span className="admin-muted"><LoaderCircle className="spin" size={16} /> Loading Google sign-in…</span></div>
        : <p className="admin-notice">The admin area is being set up and isn’t connected yet.</p>}
      {loadError && <p className="admin-notice admin-notice--error">{loadError}</p>}
      <p className="admin-fineprint"><Lock size={12} /> Access is checked by our server on every request.</p>
    </section>
  )
}

function DeniedCard({ message, onSwitch }: { message: string; onSwitch: () => void }) {
  return (
    <section className="admin-card admin-card--narrow" aria-labelledby="denied-heading" role="alert">
      <span className="admin-badge admin-badge--lock"><Lock size={18} /></span>
      <h1 id="denied-heading">No <em>access.</em></h1>
      <p className="admin-card__copy">{message}</p>
      <p className="admin-card__copy">If you’re a Ragistone owner, sign in with the Google account you gave us.</p>
      <button className="button button--dark" type="button" onClick={onSwitch}>Use a different account</button>
    </section>
  )
}

function SecurityPanel({ token, onAuthError }: { token: string; onAuthError: (err: ApiError) => void }) {
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<SecurityReport | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true); setError('')
    try {
      setReport(await callApi<SecurityReport>('securityCheck', token))
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'unauthenticated' || err.code === 'not_allowed')) return onAuthError(err)
      setError(err instanceof Error ? err.message : 'Check failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="security-heading">
      <div className="admin-panel__head">
        <div>
          <h2 id="security-heading">Privacy check</h2>
          <p>Confirms every file in the Drive folder is private and shared only with the owners.</p>
        </div>
        <button className="admin-button" type="button" onClick={run} disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />} {busy ? 'Checking…' : 'Run check'}
        </button>
      </div>
      {error && <p className="admin-notice admin-notice--error">{error}</p>}
      {report && (
        <div className={report.allPrivate ? 'admin-result admin-result--ok' : 'admin-result admin-result--bad'}>
          <strong>{report.allPrivate ? 'All private.' : 'Needs attention.'}</strong>
          <span>{report.checked} item{report.checked === 1 ? '' : 's'} checked · owned by {report.owner}</span>
          <span>Shared with: {report.sharedWith.length ? report.sharedWith.join(', ') : 'nobody else yet'}</span>
          {report.linkShared.map((item) => <span key={item.path}>Link-shared ({item.access}): {item.path}</span>)}
          {report.unexpectedPeople.length > 0 && <span>Not an owner: {report.unexpectedPeople.join(', ')}</span>}
        </div>
      )}
    </section>
  )
}

function Dashboard({ user, token, onAuthError }: { user: User; token: string; onAuthError: (err: ApiError) => void }) {
  const [view, setView] = useState<'home' | 'documents' | 'sourcing' | 'expenses' | 'parties' | 'products' | 'purchases' | 'sales' | 'payments' | 'reports'>('home')
  const first = user.name || user.email.split('@')[0]
  const back = () => setView('home')
  if (view === 'documents') return <DocumentsPanel token={token} onAuthError={onAuthError} onBack={back} />
  if (view === 'sourcing') return <SourcingPanel token={token} onAuthError={onAuthError} onBack={back} />
  if (view === 'expenses') return <ExpensesPanel token={token} onAuthError={onAuthError} onBack={back} />
  if (view === 'parties') return <PartiesPanel token={token} onAuthError={onAuthError} onBack={back} />
  if (view === 'products') return <ProductsPanel token={token} onAuthError={onAuthError} onBack={back} />
  if (view === 'purchases') return <PurchasesPanel token={token} onAuthError={onAuthError} onBack={back} />
  if (view === 'sales') return <SalesPanel token={token} onAuthError={onAuthError} onBack={back} />
  if (view === 'payments') return <PaymentsPanel token={token} onAuthError={onAuthError} onBack={back} />
  if (view === 'reports') return <ReportsPanel token={token} onAuthError={onAuthError} onBack={back} />
  return (
    <>
      <section className="admin-welcome">
        <p className="eyebrow"><span className="eyebrow__line" /> Owners only</p>
        <h1>Good to see you, <em>{first}.</em></h1>
        <p className="admin-verified"><ShieldCheck size={16} /> Access verified by the server for {user.email}</p>
      </section>
      <MonthStrip token={token} onAuthError={onAuthError} />
      <section aria-labelledby="ready-heading">
        <h2 id="ready-heading" className="admin-section-title">The business</h2>
        <div className="admin-tiles">
          {ready.map(({ id, title, note, icon: Icon }) => (
            <button className="admin-tile" type="button" key={id} onClick={() => setView(id)}>
              <div className="admin-tile__top"><Icon size={20} strokeWidth={1.6} /><span className="admin-soon">Open</span></div>
              <h3>{title}</h3>
              <p>{note}</p>
            </button>
          ))}
        </div>
      </section>
      <SecurityPanel token={token} onAuthError={onAuthError} />
    </>
  )
}

export default function AdminApp() {
  const [state, setState] = useState<State>(() => (loadToken() ? { kind: 'checking' } : { kind: 'signed-out' }))

  const verify = useCallback(async (token: string) => {
    setState({ kind: 'checking' })
    try {
      const user = await callApi<User>('whoami', token)
      saveToken(token)
      setState({ kind: 'ready', token, user })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'not_allowed') {
        clearToken()
        setState({ kind: 'denied', message: err.message })
      } else if (err instanceof ApiError && err.code === 'unauthenticated') {
        clearToken()
        setState({ kind: 'signed-out', notice: err.message })
      } else {
        setState({ kind: 'error', token, message: err instanceof Error ? err.message : 'Something went wrong.' })
      }
    }
  }, [])

  // Pick up a still-valid sign-in from this browser tab.
  useEffect(() => {
    const token = loadToken()
    if (token) verify(token)
  }, [verify])

  // Google sign-ins last an hour; sign out cleanly when it runs out.
  useEffect(() => {
    if (state.kind !== 'ready') return
    const exp = readClaims(state.token).exp ?? 0
    const ms = Math.max(0, (exp - 60) * 1000 - Date.now())
    const timer = window.setTimeout(() => {
      clearToken()
      setState({ kind: 'signed-out', notice: 'Your sign-in lasts an hour. Please sign in again to continue.' })
    }, ms)
    return () => window.clearTimeout(timer)
  }, [state])

  const signOut = () => { clearToken(); setState({ kind: 'signed-out' }) }
  const onAuthError = (err: ApiError) => {
    clearToken()
    setState(err.code === 'not_allowed' ? { kind: 'denied', message: err.message } : { kind: 'signed-out', notice: err.message })
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__brand"><BrandMark /><span className="admin-tag">Admin</span><a className="admin-button admin-button--ghost" href="/">Home Page</a></div>
          {state.kind === 'ready' && (
            <div className="admin-header__user">
              <span className="admin-header__email">{state.user.email}</span>
              <button className="admin-button admin-button--ghost" type="button" onClick={signOut}><LogOut size={15} /> Sign out</button>
            </div>
          )}
        </div>
      </header>
      <main className="admin-main">
        {state.kind === 'signed-out' && <SignInCard notice={state.notice} onToken={verify} />}
        {state.kind === 'checking' && (
          <section className="admin-card admin-card--narrow" aria-live="polite">
            <p className="admin-muted"><LoaderCircle className="spin" size={18} /> Checking your access…</p>
          </section>
        )}
        {state.kind === 'denied' && <DeniedCard message={state.message} onSwitch={() => setState({ kind: 'signed-out' })} />}
        {state.kind === 'error' && (
          <section className="admin-card admin-card--narrow" role="alert">
            <h1>Can’t <em>connect.</em></h1>
            <p className="admin-card__copy">{state.message}</p>
            <div className="admin-actions">
              <button className="button button--dark" type="button" onClick={() => verify(state.token)}>Try again</button>
              <button className="admin-button admin-button--ghost" type="button" onClick={signOut}>Sign out</button>
            </div>
          </section>
        )}
        {state.kind === 'ready' && <Dashboard user={state.user} token={state.token} onAuthError={onAuthError} />}
      </main>
    </div>
  )
}
