import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, LoaderCircle, Trash2 } from 'lucide-react'
import { ApiError, callApi, isAuthError } from './api'
import { EXPENSE_CATEGORIES, inr, PARTNERS, PAYMENT_MODES, todayISO } from './constants'
import { FilePreview } from './Preview'
import { prepareFile, type PreparedFile } from './prepareFile'

type Expense = {
  id: string
  date: string
  amount: number
  category: string
  paidBy: string
  mode: string
  note: string
  receiptId: string
  receiptName: string
}
type Summary = {
  total: number
  contributions: { name: string; paid: number; share: number; net: number }[]
  transfers: { from: string; to: string; amount: number }[]
}
type Preview = { name: string; mime: string; data: string }

type ExpenseForm = { date: string; amount: string; category: string; paidBy: string; mode: string; note: string }

const emptyForm = (): ExpenseForm => ({
  date: todayISO(),
  amount: '',
  category: EXPENSE_CATEGORIES[0],
  paidBy: PARTNERS[0],
  mode: PAYMENT_MODES[0],
  note: '',
})

export function ExpensesPanel({ token, onAuthError, onBack }: { token: string; onAuthError: (err: ApiError) => void; onBack: () => void }) {
  const [rows, setRows] = useState<Expense[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [receipt, setReceipt] = useState<PreparedFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)

  const fail = (err: unknown) => {
    if (isAuthError(err)) return onAuthError(err)
    setError(err instanceof Error ? err.message : 'Something went wrong.')
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await callApi<{ rows: Expense[]; summary: Summary }>('listExpenses', token)
      setRows(data.rows)
      setSummary(data.summary)
    } catch (err) {
      fail(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const onReceipt = async (list: FileList | null) => {
    const file = list?.[0]
    if (!file) { setReceipt(null); return }
    setError('')
    try {
      setReceipt(await prepareFile(file))
    } catch (err) {
      setReceipt(null)
      setError(err instanceof Error ? err.message : 'Could not read that photo.')
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!(amount > 0)) { setError('Enter an amount greater than zero.'); return }
    setBusy('Saving…')
    setError('')
    setNotice('')
    try {
      await callApi('addExpense', token, {
        date: form.date,
        amount,
        category: form.category,
        paidBy: form.paidBy,
        mode: form.mode,
        note: form.note,
        receipt: receipt || undefined,
      })
      setNotice('Expense saved.')
      setForm(emptyForm())
      setReceipt(null)
      await load()
    } catch (err) {
      fail(err)
    } finally {
      setBusy('')
    }
  }

  const remove = async (row: Expense) => {
    if (!window.confirm('Delete this ' + inr(row.amount) + ' expense' + (row.receiptId ? ' and its receipt' : '') + '?')) return
    setBusy('Deleting…')
    setError('')
    try {
      await callApi('deleteExpense', token, { id: row.id })
      setNotice('Expense deleted.')
      await load()
    } catch (err) {
      fail(err)
    } finally {
      setBusy('')
    }
  }

  const openReceipt = async (row: Expense) => {
    setBusy('Opening receipt…')
    setError('')
    try {
      setPreview(await callApi<Preview>('getDocument', token, { fileId: row.receiptId }))
    } catch (err) {
      fail(err)
    } finally {
      setBusy('')
    }
  }

  return (
    <section aria-labelledby="expenses-heading">
      <button className="admin-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <h1 id="expenses-heading">Expenses</h1>
      <p className="admin-lead">Each expense is split equally between the three partners. The list below is the smallest set of payments that settles it.</p>

      {summary && (
        <>
          <div className="admin-split">
            {summary.contributions.map((person) => (
              <article key={person.name}>
                <span>{person.name}</span>
                <strong>{inr(person.paid)}</strong>
                <em>Share {inr(person.share)} · {person.net > 0.004 ? 'gets back ' + inr(person.net) : person.net < -0.004 ? 'owes ' + inr(Math.abs(person.net)) : 'settled'}</em>
              </article>
            ))}
          </div>
          <div className="admin-result admin-result--ok">
            <strong>Total spent {inr(summary.total)}</strong>
            {summary.transfers.length === 0
              ? <span>All settled. Nobody owes anyone.</span>
              : summary.transfers.map((item) => <span key={item.from + item.to}>{item.from} pays {item.to} {inr(item.amount)}</span>)}
          </div>
        </>
      )}

      <form className="admin-form" onSubmit={submit}>
        <h2>Add an expense</h2>
        <div className="admin-form__grid">
          <label>Date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label>Amount (₹)<input inputMode="decimal" required min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Paid by<select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}>{PARTNERS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Payment mode<select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>{PAYMENT_MODES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Receipt photo<input type="file" accept="image/*,.pdf" onChange={(e) => onReceipt(e.target.files)} /></label>
          <label className="admin-form__wide">Note<textarea maxLength={500} rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional" /></label>
        </div>
        {receipt && <p className="admin-fineprint">Receipt attached: {receipt.name}</p>}
        {notice && <p className="admin-notice">{notice}</p>}
        {error && <p className="admin-notice admin-notice--error">{error}</p>}
        <button className="admin-button" type="submit" disabled={!!busy}>{busy ? <LoaderCircle className="spin" size={15} /> : null} {busy || 'Save expense'}</button>
      </form>

      {loading ? <p className="admin-muted"><LoaderCircle className="spin" size={16} /> Loading expenses…</p> : rows.length === 0 ? <p className="admin-empty">No expenses yet.</p> : (
        <div className="admin-tablewrap">
          <table className="admin-table">
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Category</th><th>Paid by</th><th>Mode</th><th>Note</th><th>Receipt</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{inr(row.amount)}</td>
                  <td>{row.category}</td>
                  <td>{row.paidBy}</td>
                  <td>{row.mode}</td>
                  <td>{row.note}</td>
                  <td>{row.receiptId ? <button className="admin-link" type="button" disabled={!!busy} onClick={() => openReceipt(row)}>{row.receiptName || 'View'}</button> : '—'}</td>
                  <td><button className="admin-link" type="button" disabled={!!busy} onClick={() => remove(row)}><Trash2 size={14} /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview && <FilePreview name={preview.name} mime={preview.mime} data={preview.data} onClose={() => setPreview(null)} />}
    </section>
  )
}
