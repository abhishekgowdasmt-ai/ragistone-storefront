export const DOC_FOLDERS = ['GST', 'MSME', 'FSSAI', 'Product Plans', 'Bills & Receipts', 'Other'] as const

export const PARTNERS = ['Abhishek BG', 'Chethan Kumar S', 'Rajath M'] as const

export const EXPENSE_CATEGORIES = ['Materials', 'Packaging', 'Transport', 'Rent', 'Utilities', 'Marketing', 'Food', 'Professional fees', 'Other'] as const

export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank transfer', 'Card', 'Other'] as const

export const MAX_FILE_BYTES = 9 * 1024 * 1024

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  txt: 'text/plain',
  csv: 'text/csv',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function guessMime(file: File): string {
  if (file.type) return file.type.split(';')[0].trim().toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return MIME_BY_EXT[ext] || ''
}

export function inr(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
