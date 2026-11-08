import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Download, LoaderCircle, Trash2 } from 'lucide-react'
import { ApiError, callApi, isAuthError } from './api'
import { PAYMENT_MODES, todayISO, inr } from './constants'
import { base64ToBlob } from './prepareFile'

type Auth = { token: string; onAuthError: (err: ApiError) => void; onBack: () => void }

function useFail(onAuthError: (err: ApiError) => void) {
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fail = (err: unknown) => {
    if (isAuthError(err)) return onAuthError(err)
    setError(err instanceof Error ? err.message : 'Something went wrong.')
  }
  return { error, setError, notice, setNotice, fail }
}

function Back({ onBack, title, lead }: { onBack: () => void; title: string; lead: string }) {
  return (
    <>
      <button className="admin-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <h1>{title}</h1>
      <p className="admin-lead">{lead}</p>
    </>
  )
}

type Party = { id: string; kind: string; name: string; phone: string; gstin: string; address: string; state: string }
type Product = { id: string; name: string; category: string; hsn: string; unit: string; gst: number; purchase: number; selling: number; stock: number; low: number; lowStock: boolean }
type Business = { legalName: string; tradeName: string; address: string; phone: string; gstin: string; state: string; bank: string; upi: string; states: string[] }

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen']

export function PartiesPanel({ token, onAuthError, onBack }: Auth) {
  const { error, setError, notice, setNotice, fail } = useFail(onAuthError)
  const [rows, setRows] = useState<Party[]>([])
  const [states, setStates] = useState<string[]>(['Karnataka'])
  const [form, setForm] = useState({ id: '', kind: 'Supplier', name: '', phone: '', gstin: '', address: '', state: 'Karnataka' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await callApi<{ rows: Party[]; states: string[] }>('listParties', token)
      setRows(data.rows)
      setStates(data.states)
    } catch (err) { fail(err) }
  }, [token])
  useEffect(() => { load() }, [load])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await callApi('saveParty', token, form)
      setNotice(form.id ? 'Party updated.' : 'Party saved.')
      setForm({ id: '', kind: 'Supplier', name: '', phone: '', gstin: '', address: '', state: 'Karnataka' })
      await load()
    } catch (err) { fail(err) } finally { setBusy(false) }
  }

  return (
    <section>
      <Back onBack={onBack} title="Parties" lead="Suppliers and customers. GSTIN is checked for the standard 15-character format." />
      <form className="admin-form" onSubmit={submit}>
        <h2>{form.id ? 'Edit party' : 'Add a party'}</h2>
        <div className="admin-form__grid">
          <label>Type<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option>Supplier</option><option>Customer</option></select></label>
          <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Phone<input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>GSTIN<input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} placeholder="Optional" /></label>
          <label>State<select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>{states.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="admin-form__wide">Address<textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        </div>
        {notice && <p className="admin-notice">{notice}</p>}
        {error && <p className="admin-notice admin-notice--error">{error}</p>}
        <div className="admin-actions">
          <button className="admin-button" disabled={busy} type="submit">{busy ? 'Saving…' : form.id ? 'Update party' : 'Save party'}</button>
          {form.id && <button className="admin-button admin-button--ghost" type="button" onClick={() => setForm({ id: '', kind: 'Supplier', name: '', phone: '', gstin: '', address: '', state: 'Karnataka' })}>Cancel edit</button>}
        </div>
      </form>
      <div className="admin-tablewrap">
        <table className="admin-table">
          <thead><tr><th>Type</th><th>Name</th><th>Phone</th><th>GSTIN</th><th>State</th><th></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.kind}</td><td>{row.name}</td><td>{row.phone || '—'}</td><td>{row.gstin || '—'}</td><td>{row.state}</td>
                <td>
                  <button className="admin-link" type="button" onClick={() => setForm(row)}>Edit</button>
                  {' '}
                  <button className="admin-link" type="button" onClick={async () => { if (!confirm('Remove ' + row.name + '?')) return; try { await callApi('deleteParty', token, { id: row.id }); await load() } catch (err) { fail(err) } }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="admin-empty">No parties yet.</p>}
    </section>
  )
}

export function ProductsPanel({ token, onAuthError, onBack }: Auth) {
  const { error, setError, notice, setNotice, fail } = useFail(onAuthError)
  const [rows, setRows] = useState<Product[]>([])
  const [form, setForm] = useState({ id: '', name: '', category: '', hsn: '', unit: 'pcs', gst: '18', purchase: '', selling: '', low: '0', opening: '' })
  const [stockFor, setStockFor] = useState<Product | null>(null)
  const [stockQty, setStockQty] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { setRows((await callApi<{ rows: Product[] }>('listProducts', token)).rows) } catch (err) { fail(err) }
  }, [token])
  useEffect(() => { load() }, [load])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await callApi('saveProduct', token, { ...form, gst: Number(form.gst), purchase: Number(form.purchase), selling: Number(form.selling), low: Number(form.low || 0), opening: Number(form.opening || 0) })
      setNotice(form.id ? 'Product updated.' : 'Product saved.')
      setForm({ id: '', name: '', category: '', hsn: '', unit: 'pcs', gst: '18', purchase: '', selling: '', low: '0', opening: '' })
      await load()
    } catch (err) { fail(err) } finally { setBusy(false) }
  }

  return (
    <section>
      <Back onBack={onBack} title="Products & stock" lead="Stock changes only through purchases, sales, credit notes or an adjustment, and each change is logged." />
      <form className="admin-form" onSubmit={submit}>
        <h2>{form.id ? 'Edit product' : 'Add a product'}</h2>
        <div className="admin-form__grid">
          <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label>HSN<input value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} placeholder="4–8 digits" /></label>
          <label>Unit<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{UNITS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>GST %<input required inputMode="decimal" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} /></label>
          <label>Purchase price<input required inputMode="decimal" value={form.purchase} onChange={(e) => setForm({ ...form, purchase: e.target.value })} /></label>
          <label>Selling price<input required inputMode="decimal" value={form.selling} onChange={(e) => setForm({ ...form, selling: e.target.value })} /></label>
          <label>Low-stock alert at<input inputMode="decimal" value={form.low} onChange={(e) => setForm({ ...form, low: e.target.value })} /></label>
          {!form.id && <label>Opening stock<input inputMode="decimal" value={form.opening} onChange={(e) => setForm({ ...form, opening: e.target.value })} /></label>}
        </div>
        {notice && <p className="admin-notice">{notice}</p>}
        {error && <p className="admin-notice admin-notice--error">{error}</p>}
        <button className="admin-button" disabled={busy} type="submit">{busy ? 'Saving…' : form.id ? 'Update product' : 'Save product'}</button>
      </form>
      {stockFor && (
        <form className="admin-form" onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true); setError('')
          try {
            await callApi('setStock', token, { productId: stockFor.id, stock: Number(stockQty), reason: 'Counted' })
            setNotice('Stock updated for ' + stockFor.name + '.')
            setStockFor(null)
            await load()
          } catch (err) { fail(err) } finally { setBusy(false) }
        }}>
          <h2>Set stock for {stockFor.name}</h2>
          <label>Quantity now in hand<input required inputMode="decimal" value={stockQty} onChange={(e) => setStockQty(e.target.value)} /></label>
          <button className="admin-button" type="submit" disabled={busy}>Update stock</button>
        </form>
      )}
      <div className="admin-tablewrap">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>HSN</th><th>GST</th><th>Buy</th><th>Sell</th><th>Stock</th><th></th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.lowStock ? 'is-low' : ''}>
                <td>{row.name}{row.lowStock ? ' · low' : ''}</td><td>{row.hsn || '—'}</td><td>{row.gst}%</td><td>{inr(row.purchase)}</td><td>{inr(row.selling)}</td><td>{row.stock} {row.unit}</td>
                <td><button className="admin-link" type="button" onClick={() => { setForm({ id: row.id, name: row.name, category: row.category, hsn: row.hsn, unit: row.unit, gst: String(row.gst), purchase: String(row.purchase), selling: String(row.selling), low: String(row.low), opening: '' }); }}>Edit</button> <button className="admin-link" type="button" onClick={() => { setStockFor(row); setStockQty(String(row.stock)) }}>Stock</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

type Line = { productId: string; qty: string; rate: string; gst: string }

function LineEditor({ products, lines, setLines }: { products: Product[]; lines: Line[]; setLines: (lines: Line[]) => void }) {
  const add = () => setLines(lines.concat({ productId: products[0]?.id || '', qty: '1', rate: String(products[0]?.selling || ''), gst: String(products[0]?.gst || 0) }))
  return (
    <div className="admin-lines">
      {lines.map((line, index) => (
        <div className="admin-form__grid" key={index}>
          <label>Item<select value={line.productId} onChange={(e) => {
            const product = products.find((item) => item.id === e.target.value)
            const next = lines.slice(); next[index] = { productId: e.target.value, qty: line.qty, rate: String(product?.selling ?? line.rate), gst: String(product?.gst ?? line.gst) }; setLines(next)
          }}>{products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Qty<input inputMode="decimal" value={line.qty} onChange={(e) => { const next = lines.slice(); next[index] = { ...line, qty: e.target.value }; setLines(next) }} /></label>
          <label>Rate<input inputMode="decimal" value={line.rate} onChange={(e) => { const next = lines.slice(); next[index] = { ...line, rate: e.target.value }; setLines(next) }} /></label>
          <label>GST %<input inputMode="decimal" value={line.gst} onChange={(e) => { const next = lines.slice(); next[index] = { ...line, gst: e.target.value }; setLines(next) }} /></label>
        </div>
      ))}
      <button className="admin-button admin-button--ghost" type="button" onClick={add}>Add item</button>
    </div>
  )
}

export function PurchasesPanel({ token, onAuthError, onBack }: Auth) {
  const { error, setError, notice, setNotice, fail } = useFail(onAuthError)
  const [suppliers, setSuppliers] = useState<Party[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<{ id: string; date: string; supplier: string; total: number; paid: number; balance: number }[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [date, setDate] = useState(todayISO())
  const [supplierId, setSupplierId] = useState('')
  const [paid, setPaid] = useState('0')
  const [mode, setMode] = useState('UPI')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [partyData, productData, purchaseData] = await Promise.all([
        callApi<{ rows: Party[] }>('listParties', token),
        callApi<{ rows: Product[] }>('listProducts', token),
        callApi<{ rows: { id: string; date: string; supplier: string; total: number; paid: number; balance: number }[] }>('listPurchases', token),
      ])
      const nextSuppliers = partyData.rows.filter((row) => row.kind === 'Supplier')
      setSuppliers(nextSuppliers)
      setProducts(productData.rows)
      setRows(purchaseData.rows)
      setSupplierId((current) => current || nextSuppliers[0]?.id || '')
    } catch (err) { fail(err) }
  }, [token])
  useEffect(() => { load() }, [load])

  return (
    <section>
      <Back onBack={onBack} title="Purchases" lead="A purchase raises stock. Paid amount is also recorded as money you gave the supplier." />
      <form className="admin-form" onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true); setError(''); setNotice('')
        try {
          await callApi('savePurchase', token, { date, supplierId, paid: Number(paid || 0), mode, items: lines.map((line) => ({ productId: line.productId, qty: Number(line.qty), rate: Number(line.rate), gst: Number(line.gst) })) })
          setNotice('Purchase saved and stock updated.')
          setLines([]); setPaid('0'); await load()
        } catch (err) { fail(err) } finally { setBusy(false) }
      }}>
        <h2>New purchase</h2>
        <div className="admin-form__grid">
          <label>Date<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Supplier<select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>{suppliers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}{suppliers.length === 0 && <option value="">Add a supplier first</option>}</select></label>
          <label>Paid now<input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} /></label>
          <label>Mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{PAYMENT_MODES.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <LineEditor products={products} lines={lines} setLines={setLines} />
        {notice && <p className="admin-notice">{notice}</p>}
        {error && <p className="admin-notice admin-notice--error">{error}</p>}
        <button className="admin-button" disabled={busy || !supplierId} type="submit">{busy ? 'Saving…' : 'Save purchase'}</button>
      </form>
      <div className="admin-tablewrap">
        <table className="admin-table">
          <thead><tr><th>Date</th><th>Supplier</th><th>Total</th><th>Paid</th><th>Due</th><th></th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.date}</td><td>{row.supplier}</td><td>{inr(row.total)}</td><td>{inr(row.paid)}</td><td>{inr(row.balance)}</td><td><button className="admin-link" type="button" onClick={async () => { if (!confirm('Delete this purchase and reverse the stock?')) return; try { await callApi('deletePurchase', token, { id: row.id }); await load() } catch (err) { fail(err) } }}><Trash2 size={14} /> Delete</button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}

type Sale = { id: string; date: string; docType: string; number: string; party: string; total: number; balance: number; phone: string }

async function sharePdf(token: string, id: string, phone: string, party: string, total: number) {
  const fileData = await callApi<{ name: string; mime: string; data: string; number: string }>('salePdf', token, { id })
  const blob = base64ToBlob(fileData.data, fileData.mime)
  const file = new File([blob], fileData.name, { type: 'application/pdf' })
  const text = 'Ragistone ' + fileData.number + ' for ' + inr(total) + '.'
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (nav.canShare && nav.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: fileData.name, text })
    return
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileData.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
  if (phone) window.open(waLink(phone, text), '_blank', 'noopener')
}

function waLink(phone: string, text: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 10) digits = '91' + digits
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text)
}

export function SalesPanel({ token, onAuthError, onBack }: Auth) {
  const { error, setError, notice, setNotice, fail } = useFail(onAuthError)
  const [customers, setCustomers] = useState<Party[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [rows, setRows] = useState<Sale[]>([])
  const [business, setBusiness] = useState<Business | null>(null)
  const [profile, setProfile] = useState({ legalName: '', tradeName: 'Ragistone', address: '', phone: '', gstin: '', state: 'Karnataka', bank: '', upi: '' })
  const [lines, setLines] = useState<Line[]>([])
  const [date, setDate] = useState(todayISO())
  const [docType, setDocType] = useState('invoice')
  const [partyId, setPartyId] = useState('')
  const [paid, setPaid] = useState('0')
  const [mode, setMode] = useState('UPI')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [partyData, productData, saleData, biz] = await Promise.all([
        callApi<{ rows: Party[] }>('listParties', token),
        callApi<{ rows: Product[] }>('listProducts', token),
        callApi<{ rows: Sale[] }>('listSales', token),
        callApi<Business>('getBusiness', token),
      ])
      const nextCustomers = partyData.rows.filter((row) => row.kind === 'Customer')
      setCustomers(nextCustomers)
      setProducts(productData.rows)
      setRows(saleData.rows)
      setBusiness(biz)
      setProfile({ legalName: biz.legalName, tradeName: biz.tradeName, address: biz.address, phone: biz.phone, gstin: biz.gstin, state: biz.state, bank: biz.bank, upi: biz.upi })
      setPartyId((current) => current || nextCustomers[0]?.id || '')
    } catch (err) { fail(err) }
  }, [token])
  useEffect(() => { load() }, [load])

  return (
    <section>
      <Back onBack={onBack} title="Sales & invoices" lead="Tax invoice when a GSTIN is saved, otherwise a Bill of Supply. Karnataka customers get CGST + SGST. Other states get IGST. Numbers reset every 1 April." />
      <form className="admin-form" onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true); setError('')
        try {
          await callApi('saveBusiness', token, profile)
          setNotice('Invoice details saved.')
          await load()
        } catch (err) { fail(err) } finally { setBusy(false) }
      }}>
        <h2>Details printed on invoices</h2>
        <div className="admin-form__grid">
          <label>Legal name<input required value={profile.legalName} onChange={(e) => setProfile({ ...profile, legalName: e.target.value })} /></label>
          <label>Trade name<input required value={profile.tradeName} onChange={(e) => setProfile({ ...profile, tradeName: e.target.value })} /></label>
          <label>Phone<input required value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
          <label>GSTIN<input value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })} placeholder="Blank = Bill of Supply" /></label>
          <label>State<select value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })}>{(business?.states || ['Karnataka']).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>UPI<input value={profile.upi} onChange={(e) => setProfile({ ...profile, upi: e.target.value })} placeholder="Optional" /></label>
          <label className="admin-form__wide">Address<textarea required rows={2} value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></label>
          <label className="admin-form__wide">Bank details<input value={profile.bank} onChange={(e) => setProfile({ ...profile, bank: e.target.value })} placeholder="Optional" /></label>
        </div>
        <button className="admin-button admin-button--ghost" disabled={busy} type="submit">Save invoice details</button>
      </form>
      <form className="admin-form" onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true); setError(''); setNotice('')
        try {
          const saved = await callApi<Sale>('saveSale', token, { date, docType, partyId, paid: Number(paid || 0), mode, items: lines.map((line) => ({ productId: line.productId, qty: Number(line.qty), rate: Number(line.rate), gst: Number(line.gst) })) })
          setNotice(saved.number + ' saved.')
          setLines([]); setPaid('0'); await load()
        } catch (err) { fail(err) } finally { setBusy(false) }
      }}>
        <h2>New document</h2>
        <div className="admin-form__grid">
          <label>Type<select value={docType} onChange={(e) => setDocType(e.target.value)}><option value="invoice">Tax invoice</option><option value="quotation">Quotation</option><option value="credit">Credit note</option></select></label>
          <label>Date<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Customer<select required value={partyId} onChange={(e) => setPartyId(e.target.value)}>{customers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}{customers.length === 0 && <option value="">Add a customer first</option>}</select></label>
          <label>Paid now<input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} /></label>
          <label>Mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{PAYMENT_MODES.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <LineEditor products={products} lines={lines} setLines={setLines} />
        {notice && <p className="admin-notice">{notice}</p>}
        {error && <p className="admin-notice admin-notice--error">{error}</p>}
        <button className="admin-button" disabled={busy || !partyId} type="submit">{busy ? 'Saving…' : 'Save and make PDF'}</button>
      </form>
      <div className="admin-tablewrap">
        <table className="admin-table">
          <thead><tr><th>Number</th><th>Date</th><th>Type</th><th>Customer</th><th>Total</th><th>Due</th><th></th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id}>
              <td>{row.number}</td><td>{row.date}</td><td>{row.docType}</td><td>{row.party}</td><td>{inr(row.total)}</td><td>{inr(row.balance)}</td>
              <td>
                <button className="admin-link" type="button" onClick={async () => { setBusy(true); try { await sharePdf(token, row.id, row.phone, row.party, row.total) } catch (err) { fail(err) } finally { setBusy(false) } }}><Download size={14} /> PDF / WhatsApp</button>
                {' '}
                <button className="admin-link" type="button" onClick={async () => { if (!confirm('Delete ' + row.number + ' and reverse stock?')) return; try { await callApi('deleteSale', token, { id: row.id }); await load() } catch (err) { fail(err) } }}><Trash2 size={14} /> Delete</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}

export function PaymentsPanel({ token, onAuthError, onBack }: Auth) {
  const { error, setError, notice, setNotice, fail } = useFail(onAuthError)
  const [parties, setParties] = useState<Party[]>([])
  const [rows, setRows] = useState<{ id: string; date: string; partyId: string; direction: string; amount: number; mode: string; note: string }[]>([])
  const [balances, setBalances] = useState<{ id: string; name: string; phone: string; youGet: number; youGive: number }[]>([])
  const [form, setForm] = useState({ date: todayISO(), partyId: '', direction: 'received', amount: '', mode: 'UPI', note: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [partyData, paymentData] = await Promise.all([
        callApi<{ rows: Party[] }>('listParties', token),
        callApi<{ rows: { id: string; date: string; partyId: string; direction: string; amount: number; mode: string; note: string }[]; balances: { id: string; name: string; phone: string; youGet: number; youGive: number }[] }>('listPayments', token),
      ])
      setParties(partyData.rows)
      setRows(paymentData.rows)
      setBalances(paymentData.balances)
      setForm((current) => ({ ...current, partyId: current.partyId || partyData.rows[0]?.id || '' }))
    } catch (err) { fail(err) }
  }, [token])
  useEffect(() => { load() }, [load])

  return (
    <section>
      <Back onBack={onBack} title="Payments" lead="Money in and out against a party. You’ll get is what customers still owe. You’ll give is what you still owe suppliers." />
      <div className="admin-split">
        {balances.length === 0 && <article><span>Balances</span><strong>All clear</strong><em>Nobody is due either way.</em></article>}
        {balances.map((row) => (
          <article key={row.id}>
            <span>{row.name}</span>
            <strong>{row.youGet ? inr(row.youGet) : inr(row.youGive)}</strong>
            <em>{row.youGet ? "You'll get" : "You'll give"}</em>
            {row.phone && <a className="admin-link" href={waLink(row.phone, 'Hello ' + row.name + ', this is Ragistone. ' + (row.youGet ? 'Amount due to us: ' + inr(row.youGet) : 'Amount due to you: ' + inr(row.youGive)) + '.')} target="_blank" rel="noreferrer">WhatsApp reminder</a>}
          </article>
        ))}
      </div>
      <form className="admin-form" onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true); setError(''); setNotice('')
        try {
          await callApi('savePayment', token, { ...form, amount: Number(form.amount) })
          setNotice('Payment saved.')
          setForm({ ...form, amount: '', note: '' })
          await load()
        } catch (err) { fail(err) } finally { setBusy(false) }
      }}>
        <h2>Record a payment</h2>
        <div className="admin-form__grid">
          <label>Date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label>Party<select value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>{parties.map((item) => <option value={item.id} key={item.id}>{item.kind}: {item.name}</option>)}</select></label>
          <label>Direction<select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="received">Received (you’ll get less)</option><option value="paid">Paid (you’ll give less)</option></select></label>
          <label>Amount<input required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <label>Mode<select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>{PAYMENT_MODES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Note<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        </div>
        {notice && <p className="admin-notice">{notice}</p>}
        {error && <p className="admin-notice admin-notice--error">{error}</p>}
        <button className="admin-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save payment'}</button>
      </form>
      <div className="admin-tablewrap">
        <table className="admin-table">
          <thead><tr><th>Date</th><th>Direction</th><th>Amount</th><th>Mode</th><th>Note</th><th></th></tr></thead>
          <tbody>{rows.map((row) => {
            const party = parties.find((item) => item.id === row.partyId)
            return <tr key={row.id}><td>{row.date}</td><td>{row.direction}{party ? ' · ' + party.name : ''}</td><td>{inr(row.amount)}</td><td>{row.mode}</td><td>{row.note}</td><td><button className="admin-link" type="button" onClick={async () => { if (!confirm('Delete this payment?')) return; try { await callApi('deletePayment', token, { id: row.id }); await load() } catch (err) { fail(err) } }}>Delete</button></td></tr>
          })}</tbody>
        </table>
      </div>
    </section>
  )
}

type Report = { month: string; sales: number; purchases: number; expenses: number; cogs: number; profit: number; outputGst: number; inputGst: number; netGst: number; youGet: number; youGive: number; stockValue: number; lowStock: { name: string; stock: number; low: number }[] }

export function ReportsPanel({ token, onAuthError, onBack }: Auth) {
  const { error, setError, fail } = useFail(onAuthError)
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (value: string) => {
    setBusy(true); setError('')
    try { setReport(await callApi<Report>('dashboard', token, { month: value })) } catch (err) { fail(err) } finally { setBusy(false) }
  }, [token])
  useEffect(() => { load(month) }, [load, month])

  const cards: [string, number][] = report ? [
    ['Sales (before tax)', report.sales],
    ['Purchases (before tax)', report.purchases],
    ['Expenses', report.expenses],
    ['Rough profit', report.profit],
    ['Output GST', report.outputGst],
    ['Input GST', report.inputGst],
    ['Net GST', report.netGst],
    ['Stock value', report.stockValue],
  ] : []

  return (
    <section>
      <Back onBack={onBack} title="Reports" lead="Monthly sales, purchases, expenses and a GST summary your CA can use. Profit is sales before tax, minus the cost of goods sold, minus expenses." />
      <label className="admin-month">Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
      {busy && <p className="admin-muted"><LoaderCircle className="spin" size={16} /> Loading…</p>}
      {error && <p className="admin-notice admin-notice--error">{error}</p>}
      {report && (
        <>
          <div className="admin-split admin-split--4">
            {cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{inr(value)}</strong></article>)}
          </div>
          <div className="admin-result admin-result--ok">
            <strong>Pending</strong>
            <span>You’ll get {inr(report.youGet)} · You’ll give {inr(report.youGive)}</span>
            {report.lowStock.length === 0 ? <span>No low-stock items.</span> : report.lowStock.map((item) => <span key={item.name}>{item.name}: {item.stock} in stock, alert at {item.low}</span>)}
          </div>
          <button className="admin-button" type="button" disabled={busy} onClick={async () => {
            setBusy(true)
            try {
              const file = await callApi<{ name: string; mime: string; data: string }>('exportReport', token, { month })
              const url = URL.createObjectURL(base64ToBlob(file.data, file.mime))
              const link = document.createElement('a')
              link.href = url
              link.download = file.name
              link.click()
              setTimeout(() => URL.revokeObjectURL(url), 30000)
            } catch (err) { fail(err) } finally { setBusy(false) }
          }}>Download Excel</button>
        </>
      )}
    </section>
  )
}

export function MonthStrip({ token, onAuthError }: { token: string; onAuthError: (err: ApiError) => void }) {
  const [report, setReport] = useState<Report | null>(null)
  useEffect(() => {
    callApi<Report>('dashboard', token, { month: todayISO().slice(0, 7) }).then(setReport).catch((err) => { if (isAuthError(err)) onAuthError(err) })
  }, [token, onAuthError])
  if (!report) return null
  return (
    <div className="admin-split admin-split--4">
      <article><span>Sales this month</span><strong>{inr(report.sales)}</strong></article>
      <article><span>Purchases</span><strong>{inr(report.purchases)}</strong></article>
      <article><span>Expenses</span><strong>{inr(report.expenses)}</strong></article>
      <article><span>Rough profit</span><strong>{inr(report.profit)}</strong></article>
    </div>
  )
}
