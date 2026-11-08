/**
 * Parties, stock, purchases, sales, payments and reports.
 * Runs only after verifyUser_ on the web app. Invoice profile stays in Script properties.
 */

var INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];
var PRODUCT_UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'dozen'];
var GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/* ---------- business profile ---------- */

function getBusiness_() {
  var p = props_();
  return {
    legalName: p.getProperty('LEGAL_NAME') || '',
    tradeName: p.getProperty('TRADE_NAME') || 'Ragistone',
    address: p.getProperty('ADDRESS') || '',
    phone: p.getProperty('PHONE') || '',
    gstin: (p.getProperty('GSTIN') || '').toUpperCase(),
    state: p.getProperty('STATE') || 'Karnataka',
    bank: p.getProperty('BANK') || '',
    upi: p.getProperty('UPI') || '',
    states: INDIAN_STATES,
    units: PRODUCT_UNITS
  };
}

function saveBusiness_(payload, user) {
  var gstin = String(payload.gstin || '').trim().toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) throw fail_('bad_request', 'That GSTIN does not look valid.');
  var state = String(payload.state || '');
  if (INDIAN_STATES.indexOf(state) === -1) throw fail_('bad_request', 'Choose a state.');
  var legalName = cleanText_(payload.legalName, 120);
  var tradeName = cleanText_(payload.tradeName, 120);
  var address = cleanText_(payload.address, 400);
  var phone = cleanPhone_(payload.phone);
  if (!legalName || !tradeName || !address || !phone) throw fail_('bad_request', 'Legal name, trade name, address and phone are required.');
  var p = props_();
  p.setProperty('LEGAL_NAME', legalName);
  p.setProperty('TRADE_NAME', tradeName);
  p.setProperty('ADDRESS', address);
  p.setProperty('PHONE', phone);
  p.setProperty('GSTIN', gstin);
  p.setProperty('STATE', state);
  p.setProperty('BANK', cleanText_(payload.bank, 200));
  p.setProperty('UPI', cleanText_(payload.upi, 80));
  log_(user.email, 'business.save', tradeName);
  return getBusiness_();
}

/** Called by clasp with the profile object. Not exposed on the website. */
function seedBusiness(profile) {
  saveBusiness_(profile || {}, { email: Session.getEffectiveUser().getEmail() || 'seed' });
  return getBusiness_();
}

/* ---------- parties ---------- */

function listParties_() {
  var rows = readParties_();
  rows.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  return { rows: rows, states: INDIAN_STATES };
}

function saveParty_(payload, user) {
  var party = validateParty_(payload);
  var sh = sheet_().getSheetByName('Parties');
  if (payload.id) {
    var found = findRow_(sh, payload.id);
    if (!found) throw fail_('bad_request', 'That party was not found.');
    sh.getRange(found.index, 2, 1, 6).setValues([[party.kind, party.name, party.phone, party.gstin, party.address, party.state]]);
    log_(user.email, 'party.update', party.name);
    return { id: String(payload.id) };
  }
  var id = Utilities.getUuid();
  sh.appendRow([id, party.kind, party.name, party.phone, party.gstin, party.address, party.state, user.email, new Date()]);
  log_(user.email, 'party.add', party.name);
  return { id: id };
}

function deleteParty_(payload, user) {
  var id = requireId_(payload.id);
  var used = readPurchases_().some(function (row) { return row.supplierId === id; })
    || readSales_().some(function (row) { return row.partyId === id; })
    || readPayments_().some(function (row) { return row.partyId === id; });
  if (used) throw fail_('bad_request', 'This party is used on a bill, invoice or payment, so it stays in the list.');
  var sh = sheet_().getSheetByName('Parties');
  var found = findRow_(sh, id);
  if (!found) throw fail_('bad_request', 'That party was not found.');
  sh.deleteRow(found.index);
  log_(user.email, 'party.delete', found.row[2]);
  return { id: id };
}

function validateParty_(payload) {
  var kind = payload.kind === 'Supplier' ? 'Supplier' : payload.kind === 'Customer' ? 'Customer' : '';
  if (!kind) throw fail_('bad_request', 'Choose supplier or customer.');
  var name = cleanText_(payload.name, 120);
  if (!name) throw fail_('bad_request', 'Enter a name.');
  var gstin = String(payload.gstin || '').trim().toUpperCase();
  if (gstin && !GSTIN_RE.test(gstin)) throw fail_('bad_request', 'That GSTIN does not look valid.');
  var state = String(payload.state || '');
  if (INDIAN_STATES.indexOf(state) === -1) throw fail_('bad_request', 'Choose a state.');
  return { kind: kind, name: name, phone: cleanPhone_(payload.phone), gstin: gstin, address: cleanText_(payload.address, 400), state: state };
}

/* ---------- products and stock ---------- */

function listProducts_() {
  var rows = readProducts_();
  rows.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  return { rows: rows, units: PRODUCT_UNITS };
}

function saveProduct_(payload, user) {
  var product = validateProduct_(payload);
  var sh = sheet_().getSheetByName('Products');
  if (payload.id) {
    var found = findRow_(sh, payload.id);
    if (!found) throw fail_('bad_request', 'That product was not found.');
    sh.getRange(found.index, 2, 1, 7).setValues([[product.name, product.category, product.hsn, product.unit, product.gst, product.purchase, product.selling]]);
    sh.getRange(found.index, 10).setValue(product.low);
    log_(user.email, 'product.update', product.name);
    return { id: String(payload.id) };
  }
  var id = Utilities.getUuid();
  sh.appendRow([id, product.name, product.category, product.hsn, product.unit, product.gst, product.purchase, product.selling, 0, product.low, user.email, new Date()]);
  if (product.opening > 0) moveStock_(user, { id: id, name: product.name }, product.opening, 'Opening stock', '');
  log_(user.email, 'product.add', product.name);
  return { id: id };
}

function setStock_(payload, user) {
  var product = productById_(payload.productId);
  var next = round3_(payload.stock);
  if (!(next >= 0) || next > 10000000) throw fail_('bad_request', 'Enter a stock quantity of zero or more.');
  var delta = round3_(next - product.stock);
  if (delta !== 0) moveStock_(user, product, delta, cleanText_(payload.reason, 200) || 'Adjustment', '');
  log_(user.email, 'stock.set', product.name + ' → ' + next);
  return { id: product.id, stock: next };
}

function stockLog_(payload) {
  var id = payload && payload.productId ? String(payload.productId) : '';
  var values = sheet_().getSheetByName('StockLog').getDataRange().getValues();
  var rows = [];
  for (var i = values.length - 1; i >= 1 && rows.length < 40; i--) {
    if (id && String(values[i][2]) !== id) continue;
    rows.push({
      time: cellDateTime_(values[i][0]),
      email: String(values[i][1] || ''),
      productId: String(values[i][2] || ''),
      name: String(values[i][3] || ''),
      change: Number(values[i][4]) || 0,
      balance: Number(values[i][5]) || 0,
      reason: String(values[i][6] || ''),
      ref: String(values[i][7] || '')
    });
  }
  return { rows: rows };
}

function validateProduct_(payload) {
  var name = cleanText_(payload.name, 120);
  if (!name) throw fail_('bad_request', 'Enter a product name.');
  var unit = String(payload.unit || '');
  if (PRODUCT_UNITS.indexOf(unit) === -1) throw fail_('bad_request', 'Choose a unit.');
  var gst = round2_(payload.gst);
  var purchase = round2_(payload.purchase);
  var selling = round2_(payload.selling);
  var low = round3_(payload.low);
  var opening = round3_(payload.opening);
  if (gst < 0 || gst > 100) throw fail_('bad_request', 'GST % must be between 0 and 100.');
  if (purchase < 0 || selling < 0 || low < 0 || opening < 0) throw fail_('bad_request', 'Prices and stock cannot be negative.');
  var hsn = String(payload.hsn || '').replace(/\s/g, '');
  if (hsn && !/^\d{4,8}$/.test(hsn)) throw fail_('bad_request', 'HSN should be 4 to 8 digits.');
  return { name: name, category: cleanText_(payload.category, 80), hsn: hsn, unit: unit, gst: gst, purchase: purchase, selling: selling, low: low, opening: payload.id ? 0 : opening };
}

function moveStock_(user, product, delta, reason, ref) {
  var sh = sheet_().getSheetByName('Products');
  var found = findRow_(sh, product.id);
  if (!found) throw fail_('bad_request', 'That product was not found.');
  var stock = Number(found.row[8]) || 0;
  var next = round3_(stock + delta);
  if (next < -0.0001) throw fail_('bad_request', 'Not enough stock for ' + found.row[1] + '. In stock: ' + stock + '.');
  sh.getRange(found.index, 9).setValue(next);
  sheet_().getSheetByName('StockLog').appendRow([new Date(), user.email, product.id, String(found.row[1]), delta, next, reason, ref || '']);
  return next;
}

/* ---------- purchases ---------- */

function listPurchases_() {
  var rows = readPurchases_();
  rows.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return { rows: rows };
}

function savePurchase_(payload, user) {
  var supplier = partyById_(payload.supplierId);
  if (supplier.kind !== 'Supplier') throw fail_('bad_request', 'Choose a supplier.');
  var date = requireDate_(payload.date);
  var priced = priceLines_(payload.items, true);
  var paid = round2_(payload.paid || 0);
  if (paid < 0 || paid - priced.total > 0.001) throw fail_('bad_request', 'Paid amount cannot be more than the total.');
  var mode = PAYMENT_MODES.indexOf(payload.mode) === -1 ? 'Other' : payload.mode;
  var id = Utilities.getUuid();
  priced.items.forEach(function (item) { moveStock_(user, item, item.qty, 'Purchase', id); });
  sheet_().getSheetByName('Purchases').appendRow([
    id, date, supplier.id, supplier.name, JSON.stringify(priced.items), priced.taxable, priced.gst, priced.total, paid,
    round2_(priced.total - paid), user.email, new Date()
  ]);
  if (paid > 0) sheet_().getSheetByName('Payments').appendRow([Utilities.getUuid(), date, supplier.id, 'paid', paid, mode, 'Paid with purchase', id, user.email, new Date()]);
  log_(user.email, 'purchase.add', supplier.name + ' · ₹' + priced.total);
  return { id: id };
}

function deletePurchase_(payload, user) {
  var id = requireId_(payload.id);
  var sh = sheet_().getSheetByName('Purchases');
  var found = findRow_(sh, id);
  if (!found) throw fail_('bad_request', 'That purchase was not found.');
  var items = parseItems_(found.row[4]);
  items.forEach(function (item) { ensureEnough_(item, item.qty); });
  items.forEach(function (item) { moveStock_(user, item, -item.qty, 'Purchase deleted', id); });
  deletePaymentsFor_(id);
  sh.deleteRow(findRow_(sh, id).index);
  log_(user.email, 'purchase.delete', id);
  return { id: id };
}

/* ---------- sales ---------- */

function listSales_() {
  var rows = readSales_();
  rows.sort(function (a, b) { return a.date < b.date ? 1 : a.number < b.number ? 1 : -1; });
  return { rows: rows, business: getBusiness_() };
}

function saveSale_(payload, user) {
  var docType = payload.docType === 'quotation' || payload.docType === 'credit' ? payload.docType : 'invoice';
  var party = partyById_(payload.partyId);
  if (party.kind !== 'Customer') throw fail_('bad_request', 'Choose a customer.');
  var date = requireDate_(payload.date);
  var business = getBusiness_();
  if (!business.legalName || !business.address) throw fail_('bad_request', 'Add the business details on this page before making an invoice.');
  var registered = !!business.gstin;
  var priced = priceLines_(payload.items, registered);
  var tax = priced.gst;
  var cgst = 0;
  var sgst = 0;
  var igst = 0;
  if (registered && tax) {
    if ((party.state || '') === (business.state || 'Karnataka')) {
      cgst = round2_(tax / 2);
      sgst = round2_(tax - cgst);
    } else {
      igst = tax;
    }
  }
  var paid = docType === 'quotation' ? 0 : round2_(payload.paid || 0);
  if (paid < 0 || paid - priced.total > 0.001) throw fail_('bad_request', 'Paid amount cannot be more than the total.');
  if (docType === 'invoice') priced.items.forEach(function (item) { ensureEnough_(item, item.qty); });
  if (docType === 'credit') priced.items.forEach(function (item) { /* stock comes back */ });
  var number = nextDocNumber_(docType, date);
  var id = Utilities.getUuid();
  var sign = docType === 'credit' ? 1 : docType === 'invoice' ? -1 : 0;
  if (sign) priced.items.forEach(function (item) { moveStock_(user, item, sign * item.qty, docType, id); });
  var words = rupeesInWords_(priced.total);
  var packed = JSON.stringify({ items: priced.items, address: party.address, gstin: party.gstin, phone: party.phone });
  sheet_().getSheetByName('Sales').appendRow([
    id, date, docType, number, party.id, party.name, party.state, packed, priced.taxable, cgst, sgst, igst, priced.total, words, paid,
    round2_(priced.total - paid), '', user.email, new Date()
  ]);
  if (paid > 0) {
    var direction = docType === 'credit' ? 'paid' : 'received';
    var mode = PAYMENT_MODES.indexOf(payload.mode) === -1 ? 'Other' : payload.mode;
    sheet_().getSheetByName('Payments').appendRow([Utilities.getUuid(), date, party.id, direction, paid, mode, 'With ' + number, id, user.email, new Date()]);
  }
  var sale = saleById_(id);
  try { attachPdf_(sale, business); } catch (err) { console.error(err && err.stack ? err.stack : err); }
  log_(user.email, 'sale.add', number + ' · ₹' + priced.total);
  return saleById_(id);
}

function deleteSale_(payload, user) {
  var id = requireId_(payload.id);
  var sh = sheet_().getSheetByName('Sales');
  var found = findRow_(sh, id);
  if (!found) throw fail_('bad_request', 'That document was not found.');
  var sale = saleFromRow_(found.row);
  if (sale.docType === 'credit') sale.items.forEach(function (item) { ensureEnough_(item, item.qty); });
  var sign = sale.docType === 'invoice' ? 1 : sale.docType === 'credit' ? -1 : 0;
  if (sign) sale.items.forEach(function (item) { moveStock_(user, item, sign * item.qty, 'Deleted ' + sale.number, id); });
  deletePaymentsFor_(id);
  if (sale.fileId) { try { ourFile_(sale.fileId).setTrashed(true); } catch (err) { /* already gone */ } }
  sh.deleteRow(findRow_(sh, id).index);
  log_(user.email, 'sale.delete', sale.number);
  return { id: id };
}

function salePdf_(payload) {
  var sale = saleById_(requireId_(payload.id));
  if (!sale.fileId) attachPdf_(sale, getBusiness_());
  sale = saleById_(sale.id);
  var file = ourFile_(sale.fileId);
  return { id: file.getId(), name: file.getName(), mime: 'application/pdf', data: Utilities.base64Encode(file.getBlob().getBytes()), number: sale.number, total: sale.total, party: sale.party, phone: sale.phone };
}

function attachPdf_(sale, business) {
  var file = buildInvoicePdf_(sale, business);
  var sh = sheet_().getSheetByName('Sales');
  var found = findRow_(sh, sale.id);
  if (found) sh.getRange(found.index, 17).setValue(file.getId());
  return file;
}

function buildInvoicePdf_(sale, business) {
  var registered = !!business.gstin;
  var title = sale.docType === 'quotation' ? 'Quotation' : sale.docType === 'credit' ? 'Credit note' : (registered ? 'Tax invoice' : 'Bill of Supply');
  var ss = SpreadsheetApp.create(sale.number);
  try {
    var sh = ss.getSheets()[0];
    var rows = [
      [business.tradeName || 'Ragistone', '', '', '', '', title],
      [business.legalName, '', '', '', '', sale.number],
      [business.address, '', '', '', '', sale.date],
      ['Phone: ' + business.phone, '', '', '', '', 'Place of supply: ' + sale.state],
      [registered ? 'GSTIN: ' + business.gstin : 'GSTIN: not registered', '', '', '', '', 'State: ' + (business.state || 'Karnataka')],
      [],
      ['Bill to', sale.party],
      ['Address', sale.address],
      ['GSTIN', sale.gstin || '—'],
      ['Phone', sale.phone || '—'],
      [],
      ['#', 'Item', 'HSN', 'Qty', 'Rate', 'GST %', 'Taxable', 'Tax', 'Amount']
    ];
    sale.items.forEach(function (item, index) {
      rows.push([index + 1, item.name, item.hsn, item.qty + ' ' + item.unit, item.rate, item.gst, item.taxable, item.tax, round2_(item.taxable + item.tax)]);
    });
    rows.push([]);
    rows.push(['', '', '', '', '', '', 'Taxable', '', sale.taxable]);
    if (sale.cgst) rows.push(['', '', '', '', '', '', 'CGST', '', sale.cgst]);
    if (sale.sgst) rows.push(['', '', '', '', '', '', 'SGST', '', sale.sgst]);
    if (sale.igst) rows.push(['', '', '', '', '', '', 'IGST', '', sale.igst]);
    rows.push(['', '', '', '', '', '', 'Total', '', sale.total]);
    rows.push(['In words', sale.words]);
    if (sale.paid) rows.push(['Received now', sale.paid, '', '', 'Balance', sale.balance]);
    if (business.bank) rows.push(['Bank', business.bank]);
    if (business.upi) rows.push(['UPI', business.upi]);
    var width = 9;
    var padded = rows.map(function (row) {
      var copy = row.slice();
      while (copy.length < width) copy.push('');
      return copy.slice(0, width);
    });
    sh.getRange(1, 1, padded.length, width).setValues(padded);
    sh.getRange(1, 1).setFontSize(16).setFontWeight('bold');
    sh.setColumnWidth(2, 220);
    SpreadsheetApp.flush();
    var blob = DriveApp.getFileById(ss.getId()).getAs('application/pdf').setName(sale.number.replace(/\//g, '-') + '.pdf');
    var folder = folderFromProp_(folderKey_('Invoices'));
    if (!folder) throw fail_('not_configured', 'Invoices folder is missing. Run setup again.');
    var file = folder.createFile(blob);
    file.setDescription('uploadedBy:invoice');
    try { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (err) { /* folder is private */ }
    return file;
  } finally {
    try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (err) { /* temp sheet already gone */ }
  }
}

function nextDocNumber_(docType, date) {
  var prefix = docType === 'quotation' ? 'QT' : docType === 'credit' ? 'CN' : 'RS';
  var parts = date.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var start = month >= 4 ? year : year - 1;
  var fy = start + '-' + String(start + 1).slice(-2);
  var key = 'SEQ_' + prefix + '_' + fy;
  var n = Number(props_().getProperty(key) || '0') + 1;
  props_().setProperty(key, String(n));
  var serial = String(n);
  while (serial.length < 3) serial = '0' + serial;
  return prefix + '/' + fy + '/' + serial;
}

/* ---------- payments ---------- */

function listPayments_() {
  var rows = readPayments_();
  rows.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return { rows: rows, balances: partyBalances_() };
}

function savePayment_(payload, user) {
  var party = partyById_(payload.partyId);
  var date = requireDate_(payload.date);
  var direction = payload.direction === 'paid' ? 'paid' : payload.direction === 'received' ? 'received' : '';
  if (!direction) throw fail_('bad_request', 'Choose received or paid.');
  var amount = round2_(payload.amount);
  if (!(amount > 0)) throw fail_('bad_request', 'Enter an amount greater than zero.');
  var mode = PAYMENT_MODES.indexOf(payload.mode) === -1 ? 'Other' : payload.mode;
  var id = Utilities.getUuid();
  sheet_().getSheetByName('Payments').appendRow([id, date, party.id, direction, amount, mode, cleanText_(payload.note, 300), '', user.email, new Date()]);
  log_(user.email, 'payment.add', party.name + ' · ' + direction + ' · ₹' + amount);
  return { id: id };
}

function deletePayment_(payload, user) {
  var id = requireId_(payload.id);
  var sh = sheet_().getSheetByName('Payments');
  var found = findRow_(sh, id);
  if (!found) throw fail_('bad_request', 'That payment was not found.');
  sh.deleteRow(found.index);
  log_(user.email, 'payment.delete', id);
  return { id: id };
}

function partyBalances_() {
  var purchases = readPurchases_();
  var sales = readSales_();
  var payments = readPayments_();
  return readParties_().map(function (party) {
    var billed = 0;
    var owedToThem = 0;
    purchases.forEach(function (row) { if (row.supplierId === party.id) owedToThem += row.total; });
    sales.forEach(function (row) {
      if (row.partyId !== party.id || row.docType === 'quotation') return;
      billed += row.docType === 'credit' ? -row.total : row.total;
    });
    var received = 0;
    var paid = 0;
    payments.forEach(function (row) {
      if (row.partyId !== party.id) return;
      if (row.direction === 'received') received += row.amount;
      else paid += row.amount;
    });
    var net = round2_((billed - received) - (owedToThem - paid));
    return { id: party.id, name: party.name, phone: party.phone, kind: party.kind, youGet: net > 0 ? net : 0, youGive: net < 0 ? round2_(-net) : 0 };
  }).filter(function (row) { return row.youGet > 0 || row.youGive > 0; });
}

/* ---------- reports ---------- */

function dashboard_(payload) {
  var month = String((payload && payload.month) || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM'));
  if (!/^\d{4}-\d{2}$/.test(month)) throw fail_('bad_request', 'Choose a month.');
  var salesTotal = 0;
  var cogs = 0;
  var outputGst = 0;
  readSales_().forEach(function (sale) {
    if (sale.date.slice(0, 7) !== month || sale.docType === 'quotation') return;
    var sign = sale.docType === 'credit' ? -1 : 1;
    salesTotal += sign * sale.taxable;
    outputGst += sign * (sale.cgst + sale.sgst + sale.igst);
    sale.items.forEach(function (item) { cogs += sign * item.qty * (item.cost || 0); });
  });
  var purchaseTotal = 0;
  var inputGst = 0;
  readPurchases_().forEach(function (row) {
    if (row.date.slice(0, 7) !== month) return;
    purchaseTotal += row.taxable;
    inputGst += row.gst;
  });
  var expenseTotal = 0;
  listExpenses_().rows.forEach(function (row) { if (String(row.date).slice(0, 7) === month) expenseTotal += Number(row.amount) || 0; });
  var youGet = 0;
  var youGive = 0;
  partyBalances_().forEach(function (row) { youGet += row.youGet; youGive += row.youGive; });
  var stockValue = 0;
  var lowStock = [];
  readProducts_().forEach(function (product) {
    stockValue += product.stock * product.purchase;
    if (product.stock <= product.low) lowStock.push({ id: product.id, name: product.name, stock: product.stock, low: product.low });
  });
  return {
    month: month,
    sales: round2_(salesTotal),
    purchases: round2_(purchaseTotal),
    expenses: round2_(expenseTotal),
    cogs: round2_(cogs),
    profit: round2_(salesTotal - cogs - expenseTotal),
    outputGst: round2_(outputGst),
    inputGst: round2_(inputGst),
    netGst: round2_(outputGst - inputGst),
    youGet: round2_(youGet),
    youGive: round2_(youGive),
    stockValue: round2_(stockValue),
    lowStock: lowStock
  };
}

function exportReport_(payload, user) {
  var report = dashboard_(payload);
  var ss = SpreadsheetApp.create('Ragistone ' + report.month);
  try {
    var summary = ss.getSheets()[0];
    summary.setName('Summary');
    summary.getRange(1, 1, 12, 2).setValues([
      ['Month', report.month],
      ['Sales before tax', report.sales],
      ['Purchases before tax', report.purchases],
      ['Cost of goods sold', report.cogs],
      ['Expenses', report.expenses],
      ['Rough profit', report.profit],
      ['Output GST', report.outputGst],
      ['Input GST', report.inputGst],
      ['Net GST', report.netGst],
      ['You will get', report.youGet],
      ['You will give', report.youGive],
      ['Stock value', report.stockValue]
    ]);
    writeSheet_(ss, 'Sales', ['Number', 'Date', 'Type', 'Party', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'], readSales_().filter(function (row) { return row.date.slice(0, 7) === report.month; }).map(function (row) {
      return [row.number, row.date, row.docType, row.party, row.taxable, row.cgst, row.sgst, row.igst, row.total];
    }));
    writeSheet_(ss, 'Purchases', ['Date', 'Supplier', 'Taxable', 'GST', 'Total', 'Paid', 'Balance'], readPurchases_().filter(function (row) { return row.date.slice(0, 7) === report.month; }).map(function (row) {
      return [row.date, row.supplier, row.taxable, row.gst, row.total, row.paid, row.balance];
    }));
    writeSheet_(ss, 'Expenses', ['Date', 'Amount', 'Category', 'Paid by', 'Mode', 'Note'], listExpenses_().rows.filter(function (row) { return String(row.date).slice(0, 7) === report.month; }).map(function (row) {
      return [row.date, row.amount, row.category, row.paidBy, row.mode, row.note];
    }));
    writeSheet_(ss, 'Stock', ['Name', 'Category', 'HSN', 'Stock', 'Purchase price', 'Value', 'Low at'], readProducts_().map(function (row) {
      return [row.name, row.category, row.hsn, row.stock, row.purchase, round2_(row.stock * row.purchase), row.low];
    }));
    SpreadsheetApp.flush();
    var blob = DriveApp.getFileById(ss.getId()).getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    blob.setName('Ragistone-' + report.month + '.xlsx');
    log_(user.email, 'report.export', report.month);
    return { name: 'Ragistone-' + report.month + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', data: Utilities.base64Encode(blob.getBytes()) };
  } finally {
    try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (err) { /* temp sheet already gone */ }
  }
}

function writeSheet_(ss, name, headers, rows) {
  var sh = ss.insertSheet(name);
  var all = [headers].concat(rows.length ? rows : [['—']]);
  sh.getRange(1, 1, all.length, headers.length).setValues(all.map(function (row) {
    var copy = row.slice();
    while (copy.length < headers.length) copy.push('');
    return copy;
  }));
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sh.setFrozenRows(1);
}

/* ---------- readers ---------- */

function readParties_() {
  return readTab_('Parties', function (r) {
    return { id: String(r[0]), kind: String(r[1]), name: String(r[2]), phone: String(r[3]), gstin: String(r[4] || ''), address: String(r[5] || ''), state: String(r[6] || ''), createdBy: String(r[7] || ''), createdAt: cellDateTime_(r[8]) };
  });
}
function readProducts_() {
  return readTab_('Products', function (r) {
    return { id: String(r[0]), name: String(r[1]), category: String(r[2] || ''), hsn: String(r[3] || ''), unit: String(r[4] || ''), gst: Number(r[5]) || 0, purchase: Number(r[6]) || 0, selling: Number(r[7]) || 0, stock: Number(r[8]) || 0, low: Number(r[9]) || 0, lowStock: (Number(r[8]) || 0) <= (Number(r[9]) || 0) };
  });
}
function readPurchases_() {
  return readTab_('Purchases', function (r) {
    return { id: String(r[0]), date: cellDate_(r[1]), supplierId: String(r[2]), supplier: String(r[3]), items: parseItems_(r[4]), taxable: Number(r[5]) || 0, gst: Number(r[6]) || 0, total: Number(r[7]) || 0, paid: Number(r[8]) || 0, balance: Number(r[9]) || 0 };
  });
}
function readSales_() {
  return readTab_('Sales', saleFromRow_);
}
function readPayments_() {
  return readTab_('Payments', function (r) {
    return { id: String(r[0]), date: cellDate_(r[1]), partyId: String(r[2]), direction: String(r[3]), amount: Number(r[4]) || 0, mode: String(r[5] || ''), note: String(r[6] || ''), ref: String(r[7] || ''), createdBy: String(r[8] || '') };
  });
}
function saleFromRow_(r) {
  var meta = unpackSale_(r[7]);
  return {
    id: String(r[0]), date: cellDate_(r[1]), docType: String(r[2]), number: String(r[3]), partyId: String(r[4]), party: String(r[5]), state: String(r[6] || ''),
    items: meta.items, address: meta.address, gstin: meta.gstin, phone: meta.phone,
    taxable: Number(r[8]) || 0, cgst: Number(r[9]) || 0, sgst: Number(r[10]) || 0, igst: Number(r[11]) || 0, total: Number(r[12]) || 0,
    words: String(r[13] || ''), paid: Number(r[14]) || 0, balance: Number(r[15]) || 0, fileId: String(r[16] || '')
  };
}
function readTab_(name, map) {
  var values = sheet_().getSheetByName(name).getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) if (values[i][0]) rows.push(map(values[i]));
  return rows;
}
function partyById_(id) {
  var rows = readParties_();
  for (var i = 0; i < rows.length; i++) if (rows[i].id === String(id)) return rows[i];
  throw fail_('bad_request', 'Choose a party from the list.');
}
function productById_(id) {
  var rows = readProducts_();
  for (var i = 0; i < rows.length; i++) if (rows[i].id === String(id)) return rows[i];
  throw fail_('bad_request', 'Choose a product from the list.');
}
function saleById_(id) {
  var rows = readSales_();
  for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
  throw fail_('bad_request', 'That document was not found.');
}

function priceLines_(items, chargeGst) {
  if (!items || !items.length) throw fail_('bad_request', 'Add at least one item.');
  var out = [];
  var taxable = 0;
  var gst = 0;
  items.forEach(function (item) {
    var product = productById_(item.productId);
    var qty = round3_(item.qty);
    var rate = round2_(item.rate);
    var gstPct = chargeGst ? round2_(item.gst != null && item.gst !== '' ? item.gst : product.gst) : 0;
    if (!(qty > 0) || rate < 0 || gstPct < 0 || gstPct > 100) throw fail_('bad_request', 'Check quantity, rate and GST.');
    var lineTaxable = round2_(qty * rate);
    var lineTax = round2_(lineTaxable * gstPct / 100);
    taxable += lineTaxable;
    gst += lineTax;
    out.push({ productId: product.id, name: product.name, hsn: product.hsn, unit: product.unit, qty: qty, rate: rate, gst: gstPct, cost: product.purchase, taxable: lineTaxable, tax: lineTax });
  });
  taxable = round2_(taxable);
  gst = round2_(gst);
  return { items: out, taxable: taxable, gst: gst, total: round2_(taxable + gst) };
}

function ensureEnough_(item, qty) {
  var product = productById_(item.productId);
  if (product.stock - qty < -0.0001) throw fail_('bad_request', 'Not enough stock for ' + product.name + '. In stock: ' + product.stock + '.');
}

function deletePaymentsFor_(ref) {
  var sh = sheet_().getSheetByName('Payments');
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) if (String(values[i][7]) === ref) sh.deleteRow(i + 1);
}

function parseItems_(value) {
  return unpackSale_(value).items;
}
function unpackSale_(value) {
  var parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value || '[]'); } catch (err) { parsed = []; }
  }
  if (parsed && parsed.items) return { items: parsed.items, address: parsed.address || '', gstin: parsed.gstin || '', phone: parsed.phone || '' };
  return { items: Array.isArray(parsed) ? parsed : [], address: '', gstin: '', phone: '' };
}
function findRow_(sh, id) {
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) if (String(values[i][0]) === String(id)) return { index: i + 1, row: values[i] };
  return null;
}
function requireId_(id) {
  var value = String(id || '');
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw fail_('bad_request', 'That record was not found.');
  return value;
}
function requireDate_(value) {
  var date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail_('bad_request', 'Choose a date.');
  var parts = date.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  var parsed = new Date(year, month - 1, day);
  if (year < 2020 || year > 2100 || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) throw fail_('bad_request', 'That date is not valid.');
  return date;
}
function cleanText_(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function cleanPhone_(value) {
  var digits = String(value || '').replace(/[^\d+]/g, '');
  if (digits && digits.replace(/\D/g, '').length < 10) throw fail_('bad_request', 'Enter a 10-digit phone number, or leave it blank.');
  return digits.slice(0, 16);
}
function round2_(value) { return Math.round((Number(value) || 0) * 100) / 100; }
function round3_(value) { return Math.round((Number(value) || 0) * 1000) / 1000; }

function rupeesInWords_(amount) {
  var paise = Math.round((Number(amount) || 0) * 100);
  var rupees = Math.floor(paise / 100);
  var rest = paise % 100;
  var words = rupees === 0 ? 'Zero' : indianWords_(rupees);
  var out = 'Rupees ' + words;
  if (rest) out += ' and ' + indianWords_(rest) + ' Paise';
  return out + ' Only';
}
function indianWords_(n) {
  var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function two(v) { if (v < 20) return ones[v]; return tens[Math.floor(v / 10)] + (ones[v % 10] ? ' ' + ones[v % 10] : ''); }
  function chunk(v) {
    var out = '';
    if (v >= 100) { out += ones[Math.floor(v / 100)] + ' Hundred'; v %= 100; if (v) out += ' '; }
    if (v) out += two(v);
    return out;
  }
  var parts = [];
  var crore = Math.floor(n / 10000000); n %= 10000000;
  var lakh = Math.floor(n / 100000); n %= 100000;
  var thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(chunk(crore) + ' Crore');
  if (lakh) parts.push(chunk(lakh) + ' Lakh');
  if (thousand) parts.push(chunk(thousand) + ' Thousand');
  if (n) parts.push(chunk(n));
  return parts.join(' ');
}
