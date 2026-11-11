import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, Trash2 } from 'lucide-react'
import { ApiError, callApi, isAuthError } from './api'
import { inr } from './constants'

type Row = { id: string; name: string; what: string; why: string; india: number; factory: number; note: string; status: string }

export function SourcingPanel({ token, onAuthError, onBack }: { token: string; onAuthError: (err: ApiError) => void; onBack: () => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [statuses, setStatuses] = useState<string[]>(['Researching'])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const fail = (err: unknown) => {
    if (isAuthError(err)) return onAuthError(err)
    setError(err instanceof Error ? err.message : 'Something went wrong.')
  }

  const load = useCallback(async () => {
    setBusy('Loading…')
    setError('')
    try {
      const data = await callApi<{ rows: Row[]; statuses: string[] }>('listSourcing', token)
      setRows(data.rows)
      setStatuses(data.statuses)
    } catch (err) { fail(err) } finally { setBusy('') }
  }, [token])

  useEffect(() => { load() }, [load])

  const update = (id: string, patch: Partial<Row>) => setRows(rows.map((row) => row.id === id ? { ...row, ...patch } : row))

  const save = async (row: Row) => {
    setBusy(row.id); setError(''); setNotice('')
    try {
      await callApi('saveSourcing', token, row)
      setNotice(row.name + ' saved.')
      await load()
    } catch (err) { fail(err) } finally { setBusy('') }
  }

  return (
    <section>
      <button className="admin-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <h1>Sourcing</h1>
      <p className="admin-lead">Products we may buy. India price is a realistic selling price here. Factory price is a public manufacturer or wholesale list price, not a quote and not a landed cost.</p>
      <p className="admin-notice">The November 2026 partner deck is in Documents → Product Plans. It is a discussion, not an order. First budget is ₹25,000–₹50,000 and should not all go into stock. China is the first place to compare, but IEC is not registered yet, so nothing can be imported until that is done. Vacuum steel bottles from China may need a BIS check and may attract anti-dumping duty. None of these four are approved for purchase.</p>
      {notice && <p className="admin-notice">{notice}</p>}
      {error && <p className="admin-notice admin-notice--error">{error}</p>}
      {busy === 'Loading…' && <p className="admin-muted"><LoaderCircle className="spin" size={16} /> Loading the list…</p>}
      {rows.map((row) => (
        <form className="admin-form" key={row.id} onSubmit={(event) => { event.preventDefault(); save(row) }}>
          <div className="admin-panel__head">
            <h2>{row.name}</h2>
            <select value={row.status} onChange={(e) => update(row.id, { status: e.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <p><strong>What it is. </strong>{row.what}</p>
          <p><strong>Why it is used. </strong>{row.why}</p>
          <div className="admin-form__grid">
            <label>Approx price in India (₹)<input inputMode="decimal" value={row.india} onChange={(e) => update(row.id, { india: Number(e.target.value) })} /></label>
            <label>Approx factory price (₹)<input inputMode="decimal" value={row.factory} onChange={(e) => update(row.id, { factory: Number(e.target.value) })} /></label>
            <label className="admin-form__wide">Price notes<textarea rows={4} value={row.note} onChange={(e) => update(row.id, { note: e.target.value })} /></label>
          </div>
          <p className="admin-fineprint">Working gap before freight, GST and returns: {inr(Math.max(0, row.india - row.factory))} per piece. This is not profit.</p>
          <div className="admin-actions">
            <button className="admin-button" type="submit" disabled={!!busy}>{busy === row.id ? 'Saving…' : 'Save'}</button>
            <button className="admin-button admin-button--ghost" type="button" disabled={!!busy} onClick={async () => { if (!confirm('Remove ' + row.name + ' from the sourcing list?')) return; try { await callApi('deleteSourcing', token, { id: row.id }); await load() } catch (err) { fail(err) } }}><Trash2 size={14} /> Remove</button>
          </div>
        </form>
      ))}
    </section>
  )
}
