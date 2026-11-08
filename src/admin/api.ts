import { API_URL } from './config'

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string; message: string }

/**
 * Calls the Apps Script backend. The token goes in the POST body (never the URL),
 * and text/plain avoids a CORS preflight, which Apps Script cannot answer.
 */
export async function callApi<T>(action: string, token: string, payload?: unknown): Promise<T> {
  if (!API_URL) throw new ApiError('not_configured', 'The admin area is not connected to its backend yet.')
  let res: Response
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, payload }),
    })
  } catch {
    throw new ApiError('network', 'Could not reach the server. Check your connection and try again.')
  }
  if (!res.ok) throw new ApiError('network', 'The server did not respond properly (' + res.status + ').')
  let body: ApiResponse<T>
  try {
    body = await res.json()
  } catch {
    throw new ApiError('network', 'The server sent an unexpected reply.')
  }
  if (!body.ok) throw new ApiError(body.error, body.message)
  return body.data
}
