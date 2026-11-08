import { guessMime, MAX_FILE_BYTES } from './constants'

export type PreparedFile = { name: string; mime: string; data: string }

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      const comma = value.indexOf(',')
      resolve(comma >= 0 ? value.slice(comma + 1) : value)
    }
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(blob)
  })
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const edge = Math.max(img.width, img.height)
      const scale = Math.min(1, 2000 / edge)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Could not prepare that photo.'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (!blob) reject(new Error('Could not prepare that photo.'))
        else resolve(blob)
      }, 'image/jpeg', 0.82)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo. Save it as JPG and try again.'))
    }
    img.src = url
  })
}

/** Photos are resized before upload. Other files must already be under 9 MB. */
export async function prepareFile(file: File): Promise<PreparedFile> {
  const mime = guessMime(file)
  if (mime.startsWith('image/')) {
    const blob = await compressImage(file)
    if (blob.size > MAX_FILE_BYTES) throw new Error('That photo is still over 9 MB. Try a smaller one.')
    const base = file.name.replace(/\.[^.]+$/, '').trim() || 'photo'
    return { name: base + '.jpg', mime: 'image/jpeg', data: await toBase64(blob) }
  }
  if (!mime) throw new Error('Use a PDF, photo, Word, Excel or CSV file.')
  if (file.size > MAX_FILE_BYTES) throw new Error('Keep files under 9 MB.')
  return { name: file.name, mime, data: await toBase64(file) }
}

export function base64ToBlob(data: string, mime: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime || 'application/octet-stream' })
}
