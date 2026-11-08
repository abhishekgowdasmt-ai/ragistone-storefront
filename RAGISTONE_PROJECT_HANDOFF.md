# Ragistone: Project Handoff

Everything done so far on the Ragistone website and admin area, what is pending, and how to continue.
Written for the owners and for any developer or AI coding tool (e.g. Cursor) picking this up.

Last updated: 8 Nov 2026

---

## 1. At a glance

| Item | Value |
|---|---|
| Live site | https://ragistone.com (www, http and https://www all redirect here) |
| Admin area | https://ragistone.com/admin/ (built, **not connected yet**, see §6) |
| GitHub repo (public) | https://github.com/abhishekgowdasmt-ai/ragistone-storefront |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |
| Domain | ragistone.com, registered at GoDaddy, DNS pointed to GitHub Pages |
| HTTPS | GitHub certificate approved (ragistone.com + www), valid to 5 Feb 2027, **Enforce HTTPS on** |
| Company Google account | ragistoneenterprises@gmail.com (owns the admin backend, Sheet and Drive) |
| Owners | Abhishek BG, Chethan Kumar S, Rajath M |
| Local folder | `C:\Users\user\Desktop\ragistone-storefront` (Windows 11) |

---

## 2. Ground rules (please keep following these)

1. **Do not change the homepage design**: layout, colours, fonts, images and existing text stay exactly as they are unless the owners ask for a specific change.
2. **No secrets in this repo.** It is public. The owners' personal email addresses, Sheet ID and Drive folder IDs live only in Apps Script **Script properties**. The Google sign-in Client ID and the Apps Script web-app URL *are* allowed in the repo (they are public by design; the server checks every request).
3. **Drive folder and Sheet stay private.** Never "Anyone with the link".
4. **Security is enforced in Apps Script, not just the frontend.**
5. **Ask the owners before anything that needs their login**, and go one step at a time, confirming after each part.
6. **Commit and push after each working part** (pushing to `main` deploys the live site).

---

## 3. Tech stack

- **Frontend:** React 19 + TypeScript + Vite 8, `lucide-react` icons. No router, no state library.
- **Package manager:** pnpm (lockfile `pnpm-lock.yaml`, v9). CI uses `pnpm install --frozen-lockfile`.
- **Fonts:** DM Sans (body) + Playfair Display (headings) from Google Fonts.
- **Admin backend:** Google Apps Script web app + Google Sheets (data) + Google Drive (files), all owned by ragistoneenterprises@gmail.com. Code is pushed with **clasp 3.4.1**.

### Tools installed on the Windows machine
Node.js 26.13.0 LTS, npm 11.20.0, Git 2.56, GitHub CLI 2.103.3 (`C:\Program Files\GitHub CLI\gh.exe`), clasp 3.4.1 (`C:\Users\user\AppData\Roaming\npm\clasp.cmd`).

**Windows PATH gotcha:** shells opened before these were installed don't see `node`, `npm`, `git` or `gh`. Open a new terminal, or in PowerShell run:
```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

### Commands
```bash
pnpm install          # or: npx pnpm@10 install --frozen-lockfile
npm run dev           # http://localhost:5173/  and  http://localhost:5173/admin/
npm run build         # tsc --noEmit && vite build  -> dist/
npm run preview
```
The machine has 16 GB RAM and sometimes runs low; if the dev server stops, just start it again.

---

## 4. Project structure

```
ragistone-storefront/
├─ index.html                  Homepage entry (title, meta description)
├─ admin/index.html            Admin entry (noindex, nofollow)
├─ vite.config.ts              Two-page build: main = index.html, admin = admin/index.html
├─ public/
│  ├─ CNAME                    "ragistone.com" (keeps the custom domain on every deploy)
│  ├─ favicon.svg
│  └─ assets/ragistone-kitchen-hero.png
├─ src/
│  ├─ main.tsx, App.tsx        Homepage (single component file)
│  ├─ styles.css               All homepage styles + design tokens (--ink, --olive, --cream, --paper, --line, --serif)
│  └─ admin/
│     ├─ main.tsx              Admin entry; imports ../styles.css (tokens, brand) + admin.css
│     ├─ AdminApp.tsx          Sign-in, "No access", owners' home, Privacy check
│     ├─ auth.ts               Google Identity Services: button, token storage (sessionStorage), expiry
│     ├─ api.ts                callApi(action, token, payload) -> Apps Script
│     ├─ config.ts             GOOGLE_CLIENT_ID and API_URL (public values; EMPTY until setup is done)
│     └─ admin.css             Admin styles built on the site's tokens
├─ admin-backend/              Apps Script project (pushed with clasp)
│  ├─ Code.js                  doPost router, verifyUser_ (the lock), setup(), securityReport_()
│  ├─ appsscript.json          Scopes, Asia/Kolkata timezone, web app = execute as owner, access ANYONE_ANONYMOUS
│  └─ .claspignore             Only Code.js + appsscript.json are pushed
├─ .github/workflows/deploy.yml  Build with pnpm, publish dist/ to GitHub Pages
├─ .gitignore                  node_modules, dist, .env*, .clasp.json, .clasprc.json
└─ README.md
```

---

## 5. Work completed (in order)

| # | What | Commit |
|---|---|---|
| 1 | Installed Node LTS, reinstalled dependencies with pnpm (old `node_modules` was broken) | n/a |
| 2 | **Contact Us** block at the top of the footer: "Say hello, *anytime.*" with tap-to-call links for Abhishek BG (+91 99011 10780), Chethan Kumar S (+91 87229 91408), Rajath M (+91 82779 11024). Desktop: 3 columns aligned with footer links; phone: stacked list | `f903d64` |
| 3 | Git repo created, public GitHub repo on `abhishekgowdasmt-ai`, commits authored as `abhishekgowdasmt-ai <277062396+abhishekgowdasmt-ai@users.noreply.github.com>` | `f903d64` |
| 4 | GitHub Pages deploy via Actions + `public/CNAME`; Pages source = GitHub Actions, custom domain ragistone.com | `d86b2c0` |
| 5 | GoDaddy DNS (done by owner): 4 A records `@` -> 185.199.108/109/110/111.153; `www` CNAME -> `abhishekgowdasmt-ai.github.io`. HTTPS certificate approved; **Enforce HTTPS turned on** | n/a |
| 6 | Homepage cards changed from specific products to categories: **Prep & Serveware**, **Kitchen Accessories**, **On-the-Go Essentials**, **Pet Accessories** (design unchanged; screen-reader labels + README updated) | `e821812` |
| 7 | **Admin part 1 (sign-in & lock)**: code complete, builds and type-checks; backend not yet deployed (see §6). Homepage footer gets an **"Owner login"** link to `/admin/` | `fb17944` |
| 8 | Card 01 renamed to **Home Essentials** (design unchanged) | this commit |

---

## 6. Admin area: status and next steps (PENDING)

### Why the admin page says "The admin area is being set up and isn't connected yet"
`src/admin/config.ts` has empty `GOOGLE_CLIENT_ID` and `API_URL`. The Google button only appears once both are filled in, and that needs the setup below. **This is expected, not a bug.**

### Architecture
```
ragistone.com/admin  (GitHub Pages, public code, no data)
   │ 1. "Sign in with Google" (Google Identity Services) -> ID token (JWT, ~1 hour)
   │ 2. POST text/plain {action, token, payload} to the Apps Script URL
   ▼
Apps Script web app (executes as ragistoneenterprises@gmail.com, access "Anyone")
   │ 3. verifyUser_: Google tokeninfo -> aud == OAUTH_CLIENT_ID, iss == accounts.google.com,
   │    not expired, email_verified, email in ALLOWED_EMAILS  -> else "not_allowed"/"unauthenticated"
   ▼
Google Sheet "Ragistone Admin Data" + Drive folder "Ragistone Admin" (private, shared by name with owners)
```
- "Who has access: **Anyone**" is required for a website to call Apps Script. Protection comes from the token + allowlist check in code. Verified tokens are cached (SHA-256 of token, ≤50 min); the allowlist is re-checked on every request.
- Access attempts (allowed/denied) are logged to the **Access** tab.
- `text/plain` body avoids a CORS preflight (Apps Script can't answer OPTIONS). The token is never put in the URL.

### API contract
- Request: `POST API_URL`, body `{"action": "...", "token": "<Google ID token>", "payload": {...}}`
- Response: `{"ok": true, "data": ...}` or `{"ok": false, "error": "<code>", "message": "<human text>"}`
- Error codes: `unauthenticated`, `not_allowed`, `not_configured`, `bad_request`, `server_error`, plus client-side `network`.
- Current actions: `whoami`, `securityCheck`. New features add entries to the `ACTIONS` map in `Code.js`; every action runs only after `verifyUser_`.

### Setup steps still to do (all signed in as ragistoneenterprises@gmail.com)

**Step 1: Turn on Apps Script API.** https://script.google.com/home/usersettings -> Google Apps Script API -> **On**.

**Step 2: Create the Google sign-in Client ID.**
1. https://console.cloud.google.com -> project picker -> **New project** `Ragistone Admin` -> Create -> Select project.
2. https://console.cloud.google.com/auth/overview -> **Get started**: App name `Ragistone Admin`, support email ragistoneenterprises@gmail.com -> Audience **External** -> contact email -> agree -> Create.
3. **Audience** -> **Publish app** -> Confirm (status "In production"). Basic sign-in scopes need no Google review. This deliberately lets any Google account reach sign-in so we can prove the server blocks outsiders.
4. **Clients** -> **Create client** -> Web application, name `Ragistone Admin Web`. Authorized JavaScript origins: `https://ragistone.com`, `http://localhost:5173`, `http://localhost`. No redirect URIs. Create.
5. Copy the **Client ID** (ends `.apps.googleusercontent.com`). The client secret is not used; don't share it.

**Step 3: Log clasp in** (browser opens; choose ragistoneenterprises@gmail.com, Allow):
```powershell
& "C:\Users\user\AppData\Roaming\npm\clasp.cmd" login
```

**Step 4: Create the script and push the code** (developer):
```powershell
cd admin-backend
clasp create-script --type standalone --title "Ragistone Admin"   # writes .clasp.json (gitignored)
clasp push -f
clasp open-script
```

**Step 5: Private settings** (owner, in the Apps Script editor): Project Settings (gear) -> Script properties -> Add:
- `ALLOWED_EMAILS` = the three owners' Google emails, comma-separated (the owners have these; do not commit them)
- `OAUTH_CLIENT_ID` = the Client ID from step 2

**Step 6: Run setup once** (owner): Editor -> choose function `setup` -> Run -> Review permissions -> pick ragistoneenterprises@gmail.com -> "Google hasn't verified this app" -> Advanced -> Go to Ragistone Admin (unsafe) -> Allow. (It's our own script.) The log shows the folder and Sheet links and a security report. This creates:
- Drive folder **Ragistone Admin** with subfolders GST, MSME, FSSAI, Product Plans, Bills & Receipts, Other, Invoices
- Sheet **Ragistone Admin Data** (tabs: Log, Access; header rows protected), inside that folder
- Shares the folder (and so the Sheet) with the owner emails by name; everything set to private

**Step 7: Deploy the web app** (developer):
```powershell
clasp create-deployment --description "Admin v1"
# URL = https://script.google.com/macros/s/<deploymentId>/exec
# Later code updates keep the same URL:
clasp push -f; clasp update-deployment <deploymentId> --description "..."
```

**Step 8: Connect the frontend.** Put the Client ID and the `/exec` URL into `src/admin/config.ts`, build, commit, push.

**Step 9: Test (owners help).**
- Request with no token -> must return `{"ok":false,"error":"unauthenticated",...}`:
  `curl -L -X POST -H "Content-Type: text/plain" -d "{\"action\":\"whoami\"}" <API_URL>`
- Garbage token -> `unauthenticated`.
- Sign in at /admin/ as an owner -> "Good to see you, …" + "Access verified by the server".
- Sign in with **any other Google account** -> "No access" screen, and an Access-tab row with `denied`.
- Click **Privacy check** -> "All private", shared only with the owners.
- Check on a phone.

Then commit "Admin part 1: sign-in and lock" and stop for the owners to test.

---

## 7. Roadmap: admin parts 2–9 (approved plan)

Build one part at a time, test, commit + push, then stop for the owners. Keep it simple and mobile-friendly (inputs ≥16px on phones to avoid iOS zoom), same visual style. Each new data type = a Sheet tab with a protected header row; all writes go through Apps Script actions; log changes to the **Log** tab (time, email, action, details). Use `LockService` for anything that must not collide (numbering, stock).

| Part | Feature | Details |
|---|---|---|
| 2 | **Documents** | Upload / view / download into Drive folders GST, MSME, FSSAI, Product Plans, Bills & Receipts, Other. Files go through the script as base64 (keep ≤ ~10 MB; resize phone photos client-side before upload). Never create public links. |
| 3 | **Expenses** | Date, amount, category, paid by (Abhishek BG / Chethan Kumar S / Rajath M), payment mode, note, receipt photo (Drive "Bills & Receipts"). Show each partner's total contribution and who owes whom for an equal 3-way split (fewest transfers). |
| 4 | **Parties** | Suppliers and customers: name, phone, GSTIN (validate format), address, state (dropdown of Indian states/UTs). |
| 5 | **Products & stock** | Name, category, HSN, unit, GST %, purchase price, selling price, current stock, low-stock alert level. Log every stock movement. |
| 6 | **Purchases** | Supplier, multiple items (qty, rate, GST), total, paid, balance due. Stock goes **up**. |
| 7 | **Sales & invoices** | GST tax invoice, auto-number `RS/2026-27/001` (resets each 1 April; separate series `QT/…` for quotations, `CN/…` for credit notes; lock to avoid duplicates). Our details, customer GSTIN, HSN, place of supply; **CGST+SGST** if customer state = Karnataka, else **IGST**; total in words (Indian lakh/crore). PDF saved to Drive "Invoices"; download; share on WhatsApp (Web Share API with the PDF on phones, `wa.me` text fallback). Stock goes **down** on sale, **up** on credit note. If not GST-registered yet, print "Bill of Supply" instead of tax invoice. |
| 8 | **Payments & balances** | Record money received/paid against a party; Khatabook-style "You'll get / You'll give" per party; WhatsApp payment reminder (`wa.me` link with message). |
| 9 | **Dashboard & reports** | Monthly sales, purchases, expenses, rough profit (sales − cost of goods sold − expenses), pending dues, stock value; monthly GST summary (output GST vs input GST, net) for the CA; **export to Excel (.xlsx)**. |

### Invoice details still needed from the owners (before part 7)
Legal business name, address, phone, GST registration status / GSTIN, state (expected: Karnataka), and optional bank / UPI details for invoices. These were sent as blank placeholders, so ask again.

### Known limits to tell the owners
- Apps Script responses take ~1–3 s per action.
- Free Gmail Apps Script quotas (e.g. 20,000 URL fetches/day) are far above what 3 users need.
- E-invoicing applies only above ₹5 crore turnover; have the CA review the first invoice format.

---

## 8. Hosting and DNS reference

- GitHub Pages: repo Settings -> Pages. Source: GitHub Actions. Custom domain: ragistone.com. Enforce HTTPS: on.
- Workflow: `.github/workflows/deploy.yml` (checkout -> pnpm 10 -> Node LTS -> `pnpm install --frozen-lockfile` -> `pnpm run build` -> upload `dist` -> deploy). Deprecation warnings about Node 20 actions are harmless; bump action versions when convenient.
- GoDaddy DNS for ragistone.com: A `@` -> 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153; CNAME `www` -> `abhishekgowdasmt-ai.github.io`. (AAAA records to 2606:50c0:8000–8003::153 were recommended as optional.) MX/TXT for email were left untouched.
- Optional hardening: verify ragistone.com under GitHub profile -> Settings -> Pages (adds a TXT record) to prevent domain takeover.

---

## 9. Accounts and access

| Account | Used for |
|---|---|
| GitHub `abhishekgowdasmt-ai` | Repo owner; `gh` CLI logged in with scopes `repo`, `workflow`, `gist`, `read:org` |
| ragistoneenterprises@gmail.com | Owns Apps Script, Sheet, Drive folder, Google Cloud project / OAuth client |
| Owners' personal Google accounts (3) | The only accounts allowed into /admin (stored in Script properties, not in this repo) |
| GoDaddy | Domain + DNS for ragistone.com |
