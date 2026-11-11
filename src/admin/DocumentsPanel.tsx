import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Download, Eye, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { ApiError, callApi, isAuthError } from './api'
import { DOC_FOLDERS, fileSize } from './constants'
import { FilePreview } from './Preview'
import { base64ToBlob, prepareFile } from './prepareFile'

type DocFile = { id: string; name: string; mime: string; size: number; updated: string; by: string }
type Preview = { name: string; mime: string; data: string }

export function DocumentsPanel({ token, onAuthError, onBack }: { token: string; onAuthError: (err: ApiError) => void; onBack: () => void }) {
  const [folder, setFolder] = useState<(typeof DOC_FOLDERS)[number]>('GST')
  const [files, setFiles] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)

  const fail = (err: unknown) => {
    if (isAuthError(err)) return onAuthError(err)
    setError(err instanceof Error ? err.message : 'Something went wrong.')
  }

  const load = useCallback(async (name: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await callApi<{ files: DocFile[] }>('listDocuments', token, { folder: name })
      setFiles(data.files)
    } catch (err) {
      fail(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load(folder) }, [folder, load])

  const upload = async (list: FileList | null) => {
    const file = list?.[0]
    if (!file) return
    setBusy('Uploading…')
    setError('')
    setNotice('')
    try {
      const prepared = await prepareFile(file)
      await callApi('uploadDocument', token, { folder, ...prepared })
      setNotice(prepared.name + ' saved in ' + folder + '.')
      await load(folder)
    } catch (err) {
      fail(err)
    } finally {
      setBusy('')
    }
  }

  const openFile = async (file: DocFile, download: boolean) => {
    setBusy(download ? 'Preparing download…' : 'Opening…')
    setError('')
    try {
      const data = await callApi<Preview>('getDocument', token, { fileId: file.id })
      if (download) {
        const url = URL.createObjectURL(base64ToBlob(data.data, data.mime))
        const link = document.createElement('a')
        link.href = url
        link.download = data.name
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      } else {
        setPreview(data)
      }
    } catch (err) {
      fail(err)
    } finally {
      setBusy('')
    }
  }

  const remove = async (file: DocFile) => {
    if (!window.confirm('Remove “' + file.name + '” from ' + folder + '?')) return
    setBusy('Removing…')
    setError('')
    try {
      await callApi('deleteDocument', token, { fileId: file.id })
      setNotice(file.name + ' removed.')
      await load(folder)
    } catch (err) {
      fail(err)
    } finally {
      setBusy('')
    }
  }

  return (
    <section aria-labelledby="docs-heading">
      <button className="admin-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back</button>
      <h1 id="docs-heading">Documents</h1>
      <p className="admin-lead">Files stay in the private Ragistone Drive folder. Nothing is shared by link.</p>
      <div className="admin-chips" role="tablist" aria-label="Folders">
        {DOC_FOLDERS.map((name) => (
          <button className={name === folder ? 'admin-chip admin-chip--on' : 'admin-chip'} type="button" key={name} onClick={() => { setNotice(''); setFolder(name) }}>{name}</button>
        ))}
      </div>
      <label className="admin-upload">
        <input type="file" accept="image/*,.pdf,.txt,.csv,.xls,.xlsx,.doc,.docx" disabled={!!busy} onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
        {busy ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />} {busy || 'Upload to ' + folder}
      </label>
      <p className="admin-fineprint">Photos are resized on your phone before upload. Other files up to 9 MB.</p>
      {folder === 'FSSAI' && <p className="admin-notice">Ragistone FSSAI registration 21226010008610 was issued on 04 Nov 2026. Fee is paid up to 03 Nov 2027. Renew before 03 Nov 2027. TRBM Cloud kitchen registration 21226008006267 was issued on 06 Nov 2026. Fee is paid up to 05 Nov 2027. Renew before 05 Nov 2027.</p>}
      {folder === 'MSME' && <p className="admin-notice">Udyam (MSME) registration does not expire. No renewal is required. Update the certificate on the Udyam portal only if the business name, address or activity changes.</p>}
      {notice && <p className="admin-notice">{notice}</p>}
      {error && <p className="admin-notice admin-notice--error">{error}</p>}
      {loading ? <p className="admin-muted"><LoaderCircle className="spin" size={16} /> Loading {folder}…</p> : (
        files.length === 0 ? <p className="admin-empty">Nothing in {folder} yet.</p> : (
          <ul className="admin-filelist">
            {files.map((file) => (
              <li key={file.id}>
                <div>
                  <strong>{file.name}</strong>
                  <span>{fileSize(file.size)}{file.by ? ' · ' + file.by : ''}</span>
                </div>
                <div className="admin-actions">
                  <button className="admin-button admin-button--ghost" type="button" disabled={!!busy} onClick={() => openFile(file, false)}><Eye size={15} /> View</button>
                  <button className="admin-button admin-button--ghost" type="button" disabled={!!busy} onClick={() => openFile(file, true)}><Download size={15} /> Download</button>
                  <button className="admin-button admin-button--ghost" type="button" disabled={!!busy} onClick={() => remove(file)}><Trash2 size={15} /> Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
      {preview && <FilePreview name={preview.name} mime={preview.mime} data={preview.data} onClose={() => setPreview(null)} />}
    </section>
  )
}
