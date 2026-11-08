import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { base64ToBlob } from './prepareFile'

export function FilePreview({ name, mime, data, onClose }: { name: string; mime: string; data: string; onClose: () => void }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    const blobUrl = URL.createObjectURL(base64ToBlob(data, mime))
    setUrl(blobUrl)
    return () => URL.revokeObjectURL(blobUrl)
  }, [data, mime])

  const download = () => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
  }

  const previewable = mime.startsWith('image/') || mime === 'application/pdf'

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={name}>
      <div className="admin-modal__card">
        <div className="admin-modal__bar">
          <strong>{name}</strong>
          <div className="admin-actions">
            <button className="admin-button" type="button" onClick={download}><Download size={15} /> Download</button>
            <button className="admin-button admin-button--ghost" type="button" onClick={onClose}><X size={15} /> Close</button>
          </div>
        </div>
        {previewable && url && mime.startsWith('image/') && <img className="admin-modal__preview" src={url} alt={name} />}
        {previewable && url && mime === 'application/pdf' && <iframe className="admin-modal__frame" title={name} src={url} />}
        {!previewable && <p className="admin-card__copy">This file can be downloaded. It doesn’t preview in the browser.</p>}
      </div>
    </div>
  )
}
