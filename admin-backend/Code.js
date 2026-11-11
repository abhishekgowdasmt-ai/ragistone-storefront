/**
 * Ragistone Admin: Apps Script backend.
 *
 * Runs as the company account (ragistoneenterprises@gmail.com). The web app is
 * deployed with "Who has access: Anyone" so ragistone.com/admin can call it, and
 * EVERY request is checked here, on Google's side:
 *   1. the Google sign-in token is sent to Google to confirm it is genuine and unexpired,
 *   2. it must have been issued for our own sign-in Client ID,
 *   3. the email must be verified and on the allowlist.
 * Anything else is refused before any data is touched.
 *
 * Private settings live in Project Settings -> Script properties, never in the repo:
 *   ALLOWED_EMAILS   comma-separated owner emails
 *   OAUTH_CLIENT_ID  the Web Client ID used by ragistone.com/admin
 * setup() adds ROOT_FOLDER_ID, SHEET_ID and one FOLDER_* id per document folder.
 */

var ROOT_FOLDER_NAME = 'Ragistone Admin';
var SHEET_NAME = 'Ragistone Admin Data';
var DOC_FOLDERS = ['GST', 'MSME', 'FSSAI', 'Product Plans', 'Bills & Receipts', 'Other', 'Invoices'];
var UPLOAD_FOLDERS = ['GST', 'MSME', 'FSSAI', 'Product Plans', 'Bills & Receipts', 'Other'];
var PARTNERS = ['Abhishek BG', 'Chethan Kumar S', 'Rajath M'];
var EXPENSE_CATEGORIES = ['Materials', 'Packaging', 'Transport', 'Rent', 'Utilities', 'Marketing', 'Food', 'Professional fees', 'Other'];
var PAYMENT_MODES = ['Cash', 'UPI', 'Bank transfer', 'Card', 'Other'];
var MAX_FILE_BYTES = 9 * 1024 * 1024;
var TABS = {
  Log: ['Time', 'Email', 'Action', 'Details'],
  Access: ['Time', 'Email', 'Result', 'Reason'],
  Expenses: ['Id', 'Date', 'Amount', 'Category', 'Paid by', 'Payment mode', 'Note', 'Receipt file id', 'Receipt name', 'Created by', 'Created at'],
  Parties: ['Id', 'Kind', 'Name', 'Phone', 'GSTIN', 'Address', 'State', 'Created by', 'Created at'],
  Products: ['Id', 'Name', 'Category', 'HSN', 'Unit', 'GST', 'Purchase', 'Selling', 'Stock', 'Low', 'Created by', 'Created at'],
  StockLog: ['Time', 'Email', 'Product id', 'Product', 'Change', 'Balance', 'Reason', 'Ref'],
  Purchases: ['Id', 'Date', 'Supplier id', 'Supplier', 'Items', 'Taxable', 'GST', 'Total', 'Paid', 'Balance', 'Created by', 'Created at'],
  Sales: ['Id', 'Date', 'Type', 'Number', 'Party id', 'Party', 'State', 'Items', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total', 'Words', 'Paid', 'Balance', 'File id', 'Created by', 'Created at'],
  Payments: ['Id', 'Date', 'Party id', 'Direction', 'Amount', 'Mode', 'Note', 'Ref', 'Created by', 'Created at'],
  Sourcing: ['Id', 'Name', 'What', 'Why', 'India price', 'Factory price', 'Note', 'Status', 'Updated']
};

/* ---------- web entry points ---------- */

function doGet() {
  return json_({ ok: false, error: 'forbidden', message: 'Not available.' });
}

function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents) || '{}';
    var req = JSON.parse(body);
    // Owner check runs before any action.
    var user = verifyUser_(req.token);
    var handler = Object.prototype.hasOwnProperty.call(ACTIONS, req.action) ? ACTIONS[req.action] : null;
    if (!handler) throw fail_('bad_request', 'Unknown action.');
    return json_({ ok: true, data: handler(req.payload || {}, user) });
  } catch (err) {
    if (!err.code) console.error(err && err.stack ? err.stack : err);
    return json_({
      ok: false,
      error: err.code || 'server_error',
      message: err.publicMessage || 'Something went wrong on the server.'
    });
  }
}

/* ---------- actions (each one runs only after verifyUser_ passed) ---------- */

var ACTIONS = {
  whoami: function (payload, user) {
    logAccess_(user.email, 'allowed', 'signed in');
    return { email: user.email, name: user.name };
  },
  securityCheck: function (payload, user) {
    return securityReport_();
  },
  listDocuments: function (payload) {
    return listDocuments_(payload);
  },
  uploadDocument: function (payload, user) {
    return withLock_(function () { return uploadDocument_(payload, user); });
  },
  getDocument: function (payload) {
    return getDocument_(payload);
  },
  deleteDocument: function (payload, user) {
    return withLock_(function () { return deleteDocument_(payload, user); });
  },
  listExpenses: function () {
    return withLock_(function () { return listExpenses_(); });
  },
  addExpense: function (payload, user) {
    return withLock_(function () { return addExpense_(payload, user); });
  },
  deleteExpense: function (payload, user) {
    return withLock_(function () { return deleteExpense_(payload, user); });
  },
  getBusiness: function () { return getBusiness_(); },
  saveBusiness: function (payload, user) { return withLock_(function () { return saveBusiness_(payload, user); }); },
  listParties: function () { return listParties_(); },
  saveParty: function (payload, user) { return withLock_(function () { return saveParty_(payload, user); }); },
  deleteParty: function (payload, user) { return withLock_(function () { return deleteParty_(payload, user); }); },
  listProducts: function () { return listProducts_(); },
  saveProduct: function (payload, user) { return withLock_(function () { return saveProduct_(payload, user); }); },
  setStock: function (payload, user) { return withLock_(function () { return setStock_(payload, user); }); },
  stockLog: function (payload) { return stockLog_(payload); },
  listPurchases: function () { return listPurchases_(); },
  savePurchase: function (payload, user) { return withLock_(function () { return savePurchase_(payload, user); }); },
  deletePurchase: function (payload, user) { return withLock_(function () { return deletePurchase_(payload, user); }); },
  listSales: function () { return listSales_(); },
  saveSale: function (payload, user) { return withLock_(function () { return saveSale_(payload, user); }); },
  deleteSale: function (payload, user) { return withLock_(function () { return deleteSale_(payload, user); }); },
  salePdf: function (payload) { return salePdf_(payload); },
  listPayments: function () { return listPayments_(); },
  savePayment: function (payload, user) { return withLock_(function () { return savePayment_(payload, user); }); },
  deletePayment: function (payload, user) { return withLock_(function () { return deletePayment_(payload, user); }); },
  dashboard: function (payload) { return dashboard_(payload); },
  exportReport: function (payload, user) { return withLock_(function () { return exportReport_(payload, user); }); },
  listSourcing: function () { return withLock_(function () { return listSourcing_(); }); },
  saveSourcing: function (payload, user) { return withLock_(function () { return saveSourcing_(payload, user); }); },
  deleteSourcing: function (payload, user) { return withLock_(function () { return deleteSourcing_(payload, user); }); }
};

/* ---------- the lock ---------- */

function verifyUser_(token) {
  if (!token || typeof token !== 'string' || token.length > 4096) {
    throw fail_('unauthenticated', 'Please sign in with Google.');
  }
  var clientId = props_().getProperty('OAUTH_CLIENT_ID');
  var allowed = allowedEmails_();
  if (!clientId || !allowed.length) throw fail_('not_configured', 'The admin area is not configured yet.');

  var cache = CacheService.getScriptCache();
  var key = 'tok_' + sha256_(token);
  var cached = cache.get(key);
  if (cached) {
    var cachedUser = JSON.parse(cached);
    if (allowed.indexOf(cachedUser.email) !== -1) return cachedUser;
  }

  var resp = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true }
  );
  if (resp.getResponseCode() !== 200) throw fail_('unauthenticated', 'Your sign-in has expired. Please sign in again.');

  var info = JSON.parse(resp.getContentText());
  var now = Math.floor(Date.now() / 1000);
  var issuerOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  if (info.aud !== clientId || !issuerOk || !(Number(info.exp) > now)) {
    throw fail_('unauthenticated', 'Your sign-in has expired. Please sign in again.');
  }

  var email = String(info.email || '').trim().toLowerCase();
  var verified = info.email_verified === true || info.email_verified === 'true';
  if (!email || !verified || allowed.indexOf(email) === -1) {
    logAccess_(email || '(no email)', 'denied', verified ? 'not on allowlist' : 'email not verified');
    throw fail_('not_allowed', 'This Google account' + (email ? ' (' + email + ')' : '') + ' does not have access.');
  }

  var user = { email: email, name: String(info.given_name || info.name || '') };
  var ttl = Math.min(Number(info.exp) - now - 30, 3000);
  if (ttl > 60) cache.put(key, JSON.stringify(user), ttl);
  return user;
}

/* ---------- one-time setup (run from the Apps Script editor) ---------- */

function setup() {
  var p = props_();
  var allowed = allowedEmails_();
  if (!p.getProperty('OAUTH_CLIENT_ID') || !allowed.length) {
    throw new Error('First add ALLOWED_EMAILS and OAUTH_CLIENT_ID in Project Settings -> Script properties.');
  }
  var owner = Session.getEffectiveUser().getEmail().toLowerCase();

  var root = folderFromProp_('ROOT_FOLDER_ID') || DriveApp.createFolder(ROOT_FOLDER_NAME);
  p.setProperty('ROOT_FOLDER_ID', root.getId());
  root.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  DOC_FOLDERS.forEach(function (name) {
    var key = folderKey_(name);
    var folder = folderFromProp_(key) || root.createFolder(name);
    p.setProperty(key, folder.getId());
  });

  var ss = sheetFromProp_() || SpreadsheetApp.create(SHEET_NAME);
  p.setProperty('SHEET_ID', ss.getId());
  var file = DriveApp.getFileById(ss.getId());
  var parents = file.getParents();
  var inRoot = false;
  while (parents.hasNext()) if (parents.next().getId() === root.getId()) inRoot = true;
  if (!inRoot) file.moveTo(root);
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  ensureTabs_(ss);

  // Share the whole folder (and so the Sheet inside it) with the owners by name only.
  allowed.forEach(function (email) {
    if (email !== owner) root.addEditor(email);
  });

  var report = securityReport_();
  Logger.log('Setup complete.');
  Logger.log('Folder: ' + root.getUrl());
  Logger.log('Sheet:  ' + ss.getUrl());
  Logger.log('Security: ' + JSON.stringify(report));
}

/* ---------- security report ---------- */

function securityReport_() {
  var root = folderFromProp_('ROOT_FOLDER_ID');
  if (!root) throw fail_('not_configured', 'Run setup first.');
  var linkShared = [];
  var checked = 0;

  function check(item, path) {
    checked++;
    if (item.getSharingAccess() !== DriveApp.Access.PRIVATE) {
      linkShared.push({ path: path, access: String(item.getSharingAccess()) });
    }
  }
  function walk(folder, path) {
    check(folder, path);
    var files = folder.getFiles();
    while (files.hasNext()) { var f = files.next(); check(f, path + '/' + f.getName()); }
    var subs = folder.getFolders();
    while (subs.hasNext()) { var s = subs.next(); walk(s, path + '/' + s.getName()); }
  }
  walk(root, root.getName());

  var owner = root.getOwner().getEmail().toLowerCase();
  var allowed = allowedEmails_();
  var people = root.getEditors().concat(root.getViewers()).map(function (u) { return u.getEmail().toLowerCase(); });
  var sharedWith = people.filter(function (e, i) { return people.indexOf(e) === i && e !== owner; });
  var unexpected = sharedWith.filter(function (e) { return allowed.indexOf(e) === -1; });

  return {
    checked: checked,
    owner: owner,
    sharedWith: sharedWith,
    linkShared: linkShared,
    unexpectedPeople: unexpected,
    allPrivate: linkShared.length === 0 && unexpected.length === 0
  };
}

/* ---------- documents (private Drive folders; never a public link) ---------- */

function listDocuments_(payload) {
  var folderName = String(payload.folder || '');
  if (UPLOAD_FOLDERS.indexOf(folderName) === -1) throw fail_('bad_request', 'Choose a folder.');
  var folder = folderFromProp_(folderKey_(folderName));
  if (!folder) throw fail_('not_configured', 'That folder is missing. Run setup again.');
  var files = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var file = it.next();
    if (!file.isTrashed()) files.push(fileMeta_(file));
  }
  files.sort(function (a, b) { return a.updated < b.updated ? 1 : -1; });
  return { folder: folderName, files: files };
}

function uploadDocument_(payload, user) {
  var folderName = String(payload.folder || '');
  if (UPLOAD_FOLDERS.indexOf(folderName) === -1) throw fail_('bad_request', 'Choose a folder.');
  var file = savePrivateFile_(folderName, payload.name, payload.mime, payload.data, user);
  log_(user.email, 'document.upload', folderName + ' / ' + file.getName());
  return fileMeta_(file);
}

function getDocument_(payload) {
  var file = ourFile_(payload.fileId);
  var bytes = file.getBlob().getBytes();
  if (bytes.length > MAX_FILE_BYTES) throw fail_('bad_request', 'That file is too large to open here.');
  return { id: file.getId(), name: file.getName(), mime: file.getMimeType(), data: Utilities.base64Encode(bytes) };
}

function deleteDocument_(payload, user) {
  var file = ourFile_(payload.fileId);
  var name = file.getName();
  file.setTrashed(true);
  log_(user.email, 'document.delete', name);
  return { id: file.getId() };
}

function savePrivateFile_(folderName, name, mime, base64, user) {
  var folder = folderFromProp_(folderKey_(folderName));
  if (!folder) throw fail_('not_configured', 'That folder is missing. Run setup again.');
  var clean = String(base64 || '').replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
  if (!clean || clean.length > 14000000) throw fail_('bad_request', 'That file is too large. Keep it under 9 MB.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) throw fail_('bad_request', 'That file could not be read.');
  var bytes = Utilities.base64Decode(clean);
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw fail_('bad_request', 'That file is too large. Keep it under 9 MB.');
  var file = folder.createFile(Utilities.newBlob(bytes, safeMime_(mime), safeFileName_(name)));
  file.setDescription('uploadedBy:' + user.email);
  try { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (err) { /* folder stays private */ }
  return file;
}

function fileMeta_(file) {
  var by = '';
  try {
    var match = /^uploadedBy:(.+)$/.exec(file.getDescription() || '');
    if (match) by = match[1];
  } catch (err) { by = ''; }
  return {
    id: file.getId(),
    name: file.getName(),
    mime: file.getMimeType(),
    size: file.getSize(),
    updated: file.getLastUpdated().toISOString(),
    by: by
  };
}

function ourFile_(id) {
  var fileId = String(id || '');
  if (!/^[A-Za-z0-9_-]{8,}$/.test(fileId)) throw fail_('bad_request', 'Missing file.');
  var file;
  try { file = DriveApp.getFileById(fileId); } catch (err) { throw fail_('bad_request', 'That file was not found.'); }
  if (file.isTrashed()) throw fail_('bad_request', 'That file was not found.');
  var allowed = {};
  DOC_FOLDERS.forEach(function (name) {
    var folderId = props_().getProperty(folderKey_(name));
    if (folderId) allowed[folderId] = true;
  });
  var parents = file.getParents();
  var inside = false;
  while (parents.hasNext()) if (allowed[parents.next().getId()]) inside = true;
  if (!inside) throw fail_('bad_request', 'That file is not in the admin folders.');
  return file;
}

function safeMime_(mime) {
  var value = String(mime || '').toLowerCase().split(';')[0].trim();
  var ok = {
    'application/pdf': true,
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/gif': true,
    'text/plain': true,
    'text/csv': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/msword': true,
    'application/vnd.ms-excel': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true
  };
  if (!ok[value]) throw fail_('bad_request', 'Use a PDF, photo, Word, Excel, PowerPoint or CSV file.');
  return value;
}

function safeFileName_(name) {
  var base = String(name || 'file').split(/[/\\]/).pop().replace(/[?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim();
  if (!base || base === '.' || base === '..') base = 'file';
  return base.length > 120 ? base.slice(0, 120) : base;
}

/* ---------- expenses ---------- */

function listExpenses_() {
  var sh = sheet_().getSheetByName('Expenses');
  var values = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][0]) continue;
    rows.push({
      id: String(values[i][0]),
      date: cellDate_(values[i][1]),
      amount: Number(values[i][2]) || 0,
      category: String(values[i][3] || ''),
      paidBy: String(values[i][4] || ''),
      mode: String(values[i][5] || ''),
      note: String(values[i][6] || ''),
      receiptId: String(values[i][7] || ''),
      receiptName: String(values[i][8] || ''),
      createdBy: String(values[i][9] || ''),
      createdAt: cellDateTime_(values[i][10])
    });
  }
  rows.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  return { rows: rows, summary: expenseSummary_(rows) };
}

function addExpense_(payload, user) {
  var row = validateExpense_(payload);
  var receiptId = '';
  var receiptName = '';
  if (payload.receipt && payload.receipt.data) {
    var file = savePrivateFile_('Bills & Receipts', 'Receipt ' + row.date + ' ' + (payload.receipt.name || 'photo'), payload.receipt.mime, payload.receipt.data, user);
    receiptId = file.getId();
    receiptName = file.getName();
  }
  var id = Utilities.getUuid();
  sheet_().getSheetByName('Expenses').appendRow([
    id, row.date, row.amount, row.category, row.paidBy, row.mode, row.note, receiptId, receiptName, user.email, new Date()
  ]);
  log_(user.email, 'expense.add', id + ' · ' + row.date + ' · ₹' + row.amount + ' · ' + row.paidBy);
  return { id: id };
}

function deleteExpense_(payload, user) {
  var id = String(payload.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw fail_('bad_request', 'Missing expense.');
  var sh = sheet_().getSheetByName('Expenses');
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) !== id) continue;
    var receiptId = String(values[i][7] || '');
    sh.deleteRow(i + 1);
    if (receiptId) {
      try { ourFile_(receiptId).setTrashed(true); } catch (err) { /* expense row is already removed */ }
    }
    log_(user.email, 'expense.delete', id);
    return { id: id };
  }
  throw fail_('bad_request', 'That expense was not found.');
}

function validateExpense_(payload) {
  var date = String(payload.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail_('bad_request', 'Choose a date.');
  var parts = date.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  var parsed = new Date(year, month - 1, day);
  if (year < 2020 || year > 2100 || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    throw fail_('bad_request', 'That date is not valid.');
  }
  var amount = Math.round(Number(payload.amount) * 100) / 100;
  if (!(amount > 0) || amount > 100000000) throw fail_('bad_request', 'Enter an amount greater than zero.');
  var category = String(payload.category || '');
  if (EXPENSE_CATEGORIES.indexOf(category) === -1) throw fail_('bad_request', 'Choose a category.');
  var paidBy = String(payload.paidBy || '');
  if (PARTNERS.indexOf(paidBy) === -1) throw fail_('bad_request', 'Choose who paid.');
  var mode = String(payload.mode || '');
  if (PAYMENT_MODES.indexOf(mode) === -1) throw fail_('bad_request', 'Choose how it was paid.');
  var note = String(payload.note || '').trim();
  if (note.length > 500) throw fail_('bad_request', 'Keep the note under 500 characters.');
  return { date: date, amount: amount, category: category, paidBy: paidBy, mode: mode, note: note };
}

/** Equal 3-way split in paise, then the fewest transfers that settle it. */
function expenseSummary_(rows) {
  var paid = {};
  PARTNERS.forEach(function (name) { paid[name] = 0; });
  var total = 0;
  rows.forEach(function (row) {
    if (!Object.prototype.hasOwnProperty.call(paid, row.paidBy)) return;
    var paise = Math.round(Number(row.amount) * 100);
    paid[row.paidBy] += paise;
    total += paise;
  });
  var base = Math.floor(total / PARTNERS.length);
  var extra = total - base * PARTNERS.length;
  var nets = PARTNERS.map(function (name, index) {
    var share = base + (index < extra ? 1 : 0);
    return { name: name, paid: paid[name], share: share, net: paid[name] - share };
  });
  var debtors = nets.filter(function (item) { return item.net < 0; })
    .map(function (item) { return { name: item.name, paise: item.net }; })
    .sort(function (a, b) { return a.paise - b.paise; });
  var creditors = nets.filter(function (item) { return item.net > 0; })
    .map(function (item) { return { name: item.name, paise: item.net }; })
    .sort(function (a, b) { return b.paise - a.paise; });
  var transfers = [];
  var i = 0;
  var j = 0;
  while (i < debtors.length && j < creditors.length) {
    var give = Math.min(-debtors[i].paise, creditors[j].paise);
    if (give > 0) transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: give / 100 });
    debtors[i].paise += give;
    creditors[j].paise -= give;
    if (debtors[i].paise === 0) i++;
    if (creditors[j].paise === 0) j++;
  }
  return {
    total: total / 100,
    contributions: nets.map(function (item) {
      return { name: item.name, paid: item.paid / 100, share: item.share / 100, net: item.net / 100 };
    }),
    transfers: transfers
  };
}

function cellDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Kolkata', 'yyyy-MM-dd');
  }
  return String(value || '').slice(0, 10);
}

function cellDateTime_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return String(value || '');
}

/* ---------- helpers ---------- */

function props_() { return PropertiesService.getScriptProperties(); }

function allowedEmails_() {
  return (props_().getProperty('ALLOWED_EMAILS') || '')
    .split(',')
    .map(function (s) { return s.trim().toLowerCase(); })
    .filter(function (s) { return s; });
}

function folderKey_(name) { return 'FOLDER_' + name.toUpperCase().replace(/[^A-Z0-9]+/g, '_'); }

function folderFromProp_(key) {
  var id = props_().getProperty(key);
  if (!id) return null;
  try { var f = DriveApp.getFolderById(id); return f.isTrashed() ? null : f; } catch (e) { return null; }
}

function sheetFromProp_() {
  var id = props_().getProperty('SHEET_ID');
  if (!id) return null;
  try {
    if (DriveApp.getFileById(id).isTrashed()) return null;
    return SpreadsheetApp.openById(id);
  } catch (e) { return null; }
}

function ensureTabs_(ss) {
  Object.keys(TABS).forEach(function (name) {
    var headers = TABS[name];
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
      try {
        sh.getRange(1, 1, 1, headers.length).protect()
          .setDescription('Header row: used by the admin app')
          .setWarningOnly(true);
      } catch (err) { /* header is still written if protection is unavailable */ }
    }
  });
  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

function logAccess_(email, result, reason) {
  try {
    var ss = sheetFromProp_();
    if (ss) ss.getSheetByName('Access').appendRow([new Date(), email, result, reason]);
  } catch (e) { console.error('logAccess failed: ' + e); }
}

function log_(email, action, details) {
  try {
    sheet_().getSheetByName('Log').appendRow([new Date(), email, action, String(details || '').slice(0, 500)]);
  } catch (e) { console.error('log failed: ' + e); }
}

function sheet_() {
  var ss = sheetFromProp_();
  if (!ss) throw fail_('not_configured', 'Run setup first.');
  ensureTabs_(ss);
  return ss;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    throw fail_('server_error', 'The server is busy. Try again in a moment.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

function fail_(code, message) {
  var e = new Error(message);
  e.code = code;
  e.publicMessage = message;
  return e;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run from clasp only. Moves a file the company account already owns into a private admin folder. */
function moveNamedFile(fromName, fileName, toName) {
  if (UPLOAD_FOLDERS.indexOf(fromName) === -1 || UPLOAD_FOLDERS.indexOf(toName) === -1) throw new Error('Bad folder');
  var from = folderFromProp_(folderKey_(fromName));
  var to = folderFromProp_(folderKey_(toName));
  if (!from || !to) throw new Error('Missing folder');
  var matches = from.getFilesByName(fileName);
  if (!matches.hasNext()) throw new Error('Not found: ' + fileName);
  var file = matches.next();
  file.moveTo(to);
  return to.getName() + ' / ' + file.getName();
}

function fileIntoFolder(fileId, folderName, newName) {
  if (UPLOAD_FOLDERS.indexOf(folderName) === -1) throw new Error('Bad folder');
  var folder = folderFromProp_(folderKey_(folderName));
  if (!folder) throw new Error('Missing folder');
  var file = DriveApp.getFileById(fileId);
  file.setName(safeFileName_(newName));
  file.moveTo(folder);
  file.setDescription('uploadedBy:' + (Session.getEffectiveUser().getEmail() || 'ragistoneenterprises@gmail.com'));
  try { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (err) { /* folder stays private */ }
  return file.getName();
}
