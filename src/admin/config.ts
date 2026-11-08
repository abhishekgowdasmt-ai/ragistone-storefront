// Public values only. Both are safe to publish: they identify the app, but every
// request is still checked on the server (Apps Script) against the owners' allowlist.

/** Google sign-in Web Client ID (ends with .apps.googleusercontent.com). */
export const GOOGLE_CLIENT_ID = '629612740564-mhotlqnhb3troq98v4a3ladr9a9fohps.apps.googleusercontent.com'

/** Apps Script web app URL (https://script.google.com/macros/s/.../exec). */
export const API_URL = 'https://script.google.com/macros/s/AKfycbx2MrgByqQL8wYhd6eciJgtYqgBYJodb4zfVadmbJ5N7IYKBsQ7NrfXTffpPKI8Dbdf/exec'
