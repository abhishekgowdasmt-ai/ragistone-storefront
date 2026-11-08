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
var TABS = {
  Log: ['Time', 'Email', 'Action', 'Details'],
  Access: ['Time', 'Email', 'Result', 'Reason']
};

/* ---------- web entry points ---------- */

function doGet() {
  return json_({ ok: false, error: 'forbidden', message: 'Not available.' });
}

function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents) || '{}';
    var req = JSON.parse(body);
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
  }
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
      sh.getRange(1, 1, 1, headers.length).protect()
        .setDescription('Header row: used by the admin app')
        .setWarningOnly(true);
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
