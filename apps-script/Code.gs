const SPREADSHEET_ID = '1p7BXYTvc9o3MLFbW4C2R_6KqEe5YPen70OqtGP08j3E';

const SHEETS = {
  transactions: '거래내역',
  categories: '지출항목',
  labor: '인건비_DB',
  employees: '직원_DB',
  receivables: '미수금_DB',
  receivablePayments: '미수금_입금내역_DB',
  personal: '개인지출_DB',
};

const EXPENSE_CATEGORIES = ['인건비', '마스터', '안주', '안주재료', '비품', '주류,음료', '공과금', '월세', '카드결제현금지급', '기타지출'];

// V3.3 speed engine: reuse Spreadsheet/Sheet objects during one Apps Script execution.
let __ss = null;
const __sheetCache = {};

function doGet(e) {
  try {
    const p = e.parameter || {};
    const action = p.action || 'ping';
    if (action === 'ping') return json({ ok: true, message: 'DRAMA API OK', version: 'V4.1.2-LABOR-EDIT-FIX' });
    if (action === 'init') return json(getInit_(p.date, p.startDate, p.endDate));
    if (action === 'home') return json(getHome_(p.date));
    if (action === 'dashboard') return json(getDashboard_(p.date));
    if (action === 'transactions') return json(getTransactions_(p.date));
    if (action === 'monthly') return json(getMonthly_(p.month));
    if (action === 'stats') return json(getStats_(p.startDate, p.endDate));
    if (action === 'categories') return json(getExpenseCategories_());
    if (action === 'employees') return json(getEmployees_());
    if (action === 'labor') return json(getLabor_(p.date));
    if (action === 'receivables') return json(getReceivables_());
    if (action === 'personal') return json(getPersonalExpenses_(p.date));
    return json({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    if (action === 'addTransaction') return json(addTransaction_(body.data));
    if (action === 'updateTransaction') return json(updateTransaction_(body.id, body.data));
    if (action === 'deleteTransaction') return json(deleteTransaction_(body.id));
    if (action === 'addEmployee') return json(addEmployee_(body.name));
    if (action === 'deactivateEmployee') return json(deactivateEmployee_(body.id));
    if (action === 'addLabor') return json(addLabor_(body.data));
    if (action === 'updateLabor') return json(updateLabor_(body.id, body.data));
    if (action === 'deleteLabor') return json(deleteLabor_(body.id));
    if (action === 'addReceivable') return json(addReceivable_(body.data));
    if (action === 'updateReceivable') return json(updateReceivable_(body.id, body.data));
    if (action === 'payReceivable') return json(payReceivable_(body.id, body.paid, body.method, body.memo));
    if (action === 'completeReceivable') return json(completeReceivable_(body.id, body.method, body.memo));
    if (action === 'deleteReceivable') return json(deleteReceivable_(body.id));
    if (action === 'addPersonalExpense') return json(addPersonalExpense_(body.data));
    if (action === 'deletePersonalExpense') return json(deletePersonalExpense_(body.id));
    return json({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function ss_() { if (!__ss) __ss = SpreadsheetApp.openById(SPREADSHEET_ID); return __ss; }
function sh_(name) { if (__sheetCache[name]) return __sheetCache[name]; let sheet = ss_().getSheetByName(name); if (!sheet) sheet = ss_().insertSheet(name); __sheetCache[name] = sheet; return sheet; }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function todayKst_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function makeId_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 10000); }
function parseAmount_(value) { return Number(String(value || 0).replace(/,/g, '')) || 0; }
function formatDate_(value) { if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd'); return String(value || '').slice(0, 10); }
function between_(date, startDate, endDate) { const d = String(date || '').slice(0, 10); return d >= startDate && d <= endDate; }

function cache_() { return CacheService.getScriptCache(); }
function cacheGet_(key) { const raw = cache_().get(key); if (!raw) return null; try { return JSON.parse(raw); } catch (err) { return null; } }
function cachePut_(key, value, seconds) { cache_().put(key, JSON.stringify(value), seconds); }
function cacheRemove_(keys) { cache_().removeAll(keys); }
function invalidateDate_(date) {
  const d = String(date || todayKst_()).slice(0, 10);
  const m = d.slice(0, 7);
  invalidateStats_();
  cacheRemove_([
    'init:' + d + ':' + m + '-01:' + d,
    'transactions:all', 'transactions:date:' + d, 'home:' + d, 'dashboard:' + d, 'transactions:' + d, 'monthly:' + m,
    'labor:all', 'labor:' + d, 'labor:result:' + d, 'personal:all', 'personal:' + d, 'personal:result:' + d,
    'receivables:raw', 'receivables:payments', 'receivables', 'receivableSummary'
  ]);
}
function invalidateStats_() {
  const today = todayKst_();
  const monthStart = today.slice(0, 8) + '01';
  cacheRemove_(['stats:' + monthStart + ':' + today]);
}
function props_() { return PropertiesService.getScriptProperties(); }
function cumulativeKey_() { return 'cumulativeCashValue'; }
function cashDeltaFromRow_(row) {
  if (!row || row.method !== '현금') return 0;
  const amount = parseAmount_(row.amount);
  if (row.type === '매출') return amount;
  if (row.type === '지출') return -amount;
  return 0;
}
function adjustCumulativeCash_(row, sign) {
  const delta = cashDeltaFromRow_(row) * sign;
  if (!delta) return;
  const props = props_();
  const current = props.getProperty(cumulativeKey_());
  if (current === null || current === '') return;
  props.setProperty(cumulativeKey_(), String(parseAmount_(current) + delta));
}
function getCumulativeCashFast_() {
  const props = props_();
  const saved = props.getProperty(cumulativeKey_());
  if (saved !== null && saved !== '') return parseAmount_(saved);
  const sheet = sh_(SHEETS.transactions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { props.setProperty(cumulativeKey_(), '0'); return 0; }
  const values = sheet.getRange(2, 2, lastRow - 1, 3).getValues();
  let total = 0;
  values.forEach(r => {
    const type = String(r[0] || '');
    const method = String(r[1] || '');
    const amount = parseAmount_(r[2]);
    if (method === '현금' && type === '매출') total += amount;
    if (method === '현금' && type === '지출') total -= amount;
  });
  props.setProperty(cumulativeKey_(), String(total));
  return total;
}

function ensureHeader_(sheetName, headers) {
  const sheet = sh_(sheetName);
  if (sheet.getLastRow() === 0) { sheet.appendRow(headers); return; }
  const first = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (String(first[0]) !== String(headers[0])) { sheet.clear(); sheet.appendRow(headers); }
}
function ensureTransactionHeader_() { ensureHeader_(SHEETS.transactions, ['날짜', '구분', '결제', '금액', '지출항목', '메모', 'ID']); }
function ensureLaborHeader_() { ensureHeader_(SHEETS.labor, ['날짜', '직원', '테이블번호', 'TC', '일비', '메모', 'ID', '거래ID']); }
function ensureReceivableHeader_() { ensureHeader_(SHEETS.receivables, ['날짜', '손님명', '전화번호', '발생금액', '입금금액', '잔액', '상태', '메모', 'ID']); }
function ensureReceivablePaymentHeader_() { ensureHeader_(SHEETS.receivablePayments, ['날짜', '미수금ID', '손님명', '구분', '결제', '금액', '잔액', '메모', 'ID', '거래ID']); }
function ensurePersonalHeader_() { ensureHeader_(SHEETS.personal, ['날짜', '지출자', '결제', '금액', '메모', 'ID']); }
function ensureCategories_() {
  const sheet = sh_(SHEETS.categories);
  const headers = ['항목명', '사용여부', '정렬'];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const first = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (String(first[0]) !== '항목명') { sheet.clear(); sheet.appendRow(headers); }
  const values = sheet.getDataRange().getValues();
  if (values.length > 1) sheet.getRange(2, 2, values.length - 1, 1).setValue('N');
  EXPENSE_CATEGORIES.forEach((name, idx) => {
    const found = sheet.getDataRange().getValues().findIndex((r, i) => i > 0 && String(r[0]) === name);
    if (found >= 1) sheet.getRange(found + 1, 2, 1, 2).setValues([['Y', idx + 1]]);
    else sheet.appendRow([name, 'Y', idx + 1]);
  });
}
function ensureEmployees_() {
  const sheet = sh_(SHEETS.employees);
  const headers = ['직원명', '사용여부', '정렬', 'ID'];
  if (sheet.getLastRow() === 0) { sheet.appendRow(headers); sheet.appendRow(['승란', 'Y', 1, 'EMP001']); sheet.appendRow(['신혜', 'Y', 2, 'EMP002']); return; }
  const first = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (String(first[0]) !== '직원명') { sheet.clear(); sheet.appendRow(headers); sheet.appendRow(['승란', 'Y', 1, 'EMP001']); sheet.appendRow(['신혜', 'Y', 2, 'EMP002']); }
}

function readTransactions_() {
  const cached = cacheGet_('transactions:all');
  if (cached) return cached;
  ensureTransactionHeader_();
  const sheet = sh_(SHEETS.transactions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const rows = values.filter(row => row.some(v => v !== '' && v !== null)).map(row => ({
    date: formatDate_(row[0]), type: String(row[1] || ''), method: String(row[2] || ''), amount: parseAmount_(row[3]), category: String(row[4] || ''), memo: String(row[5] || ''), id: String(row[6] || '')
  }));
  cachePut_('transactions:all', rows, 45);
  return rows;
}
function mapTransactionRow_(row) {
  return { date: formatDate_(row[0]), type: String(row[1] || ''), method: String(row[2] || ''), amount: parseAmount_(row[3]), category: String(row[4] || ''), memo: String(row[5] || ''), id: String(row[6] || '') };
}
function readTransactionsByDate_(date) {
  const target = String(date || todayKst_()).slice(0, 10);
  const key = 'transactions:date:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  ensureTransactionHeader_();
  const sheet = sh_(SHEETS.transactions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const rows = [];
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    if (!row.some(v => v !== '' && v !== null)) continue;
    if (formatDate_(row[0]) === target) rows.push(mapTransactionRow_(row));
  }
  cachePut_(key, rows, 60);
  return rows;
}
function summarize_(rows) {
  let totalSales = 0, totalExpense = 0, cardSales = 0, cashSales = 0, bankSales = 0, laborExpense = 0, cumulativeCash = 0;
  rows.forEach(r => {
    const amount = parseAmount_(r.amount);
    if (r.type === '매출') {
      totalSales += amount;
      if (r.method === '카드') cardSales += amount;
      if (r.method === '현금') { cashSales += amount; cumulativeCash += amount; }
      if (r.method === '계좌') bankSales += amount;
    }
    if (r.type === '지출') {
      if (r.category === 'TC인건비' || r.method === '인건비') laborExpense += amount;
      else totalExpense += amount;
      if (r.method === '카드') cardSales += amount;
      if (r.method === '현금') { cashSales += amount; cumulativeCash -= amount; }
      if (r.method === '계좌') bankSales += amount;
    }
  });
  return { totalSales, totalExpense, profit: totalSales - totalExpense, cardSales, cashSales, bankSales, cumulativeCash, laborExpense, transactionCount: rows.length };
}
function cumulativeCashAllFrom_(allRows) { return summarize_(allRows).cumulativeCash; }
function cumulativeCashAll_() { return getCumulativeCashFast_(); }
function getInit_(date, startDate, endDate) {
  const target = String(date || todayKst_()).slice(0, 10);
  const start = String(startDate || (target.slice(0, 8) + '01')).slice(0, 10);
  const end = String(endDate || target).slice(0, 10);
  const key = 'init:' + target + ':' + start + ':' + end;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const home = getHome_(target);
  const labor = getLabor_(target);
  const personal = getPersonalExpenses_(target);
  const receivables = getReceivables_();
  const stats = getStats_(start, end);
  const employees = getEmployees_();
  const categories = getExpenseCategories_();
  const result = { ok: true, date: target, startDate: start, endDate: end, home, labor, personal, receivables, stats, employees, categories };
  cachePut_(key, result, 20);
  return result;
}

function getHome_(date) {
  const target = date || todayKst_();
  const key = 'home:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const rows = readTransactionsByDate_(target);
  const receivable = getReceivableSummary_();
  const result = { ok: true, dashboard: { date: target, ...summarize_(rows), cumulativeCash: getCumulativeCashFast_(), receivableBalance: receivable.totalBalance, receivableCount: receivable.count }, rows: rows, categories: getExpenseCategories_().rows };
  cachePut_(key, result, 30);
  return result;
}
function getDashboard_(date) {
  const target = date || todayKst_();
  const key = 'dashboard:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const rows = readTransactionsByDate_(target);
  const receivable = getReceivableSummary_();
  const result = { ok: true, dashboard: { date: target, ...summarize_(rows), cumulativeCash: getCumulativeCashFast_(), receivableBalance: receivable.totalBalance, receivableCount: receivable.count } };
  cachePut_(key, result, 30);
  return result;
}
function getTransactions_(date) {
  const target = date || todayKst_();
  const key = 'transactions:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const result = { ok: true, rows: readTransactionsByDate_(target) };
  cachePut_(key, result, 30);
  return result;
}
function getMonthly_(month) {
  const target = month || todayKst_().slice(0, 7);
  const key = 'monthly:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const rows = readTransactions_().filter(r => String(r.date).startsWith(target));
  const sum = summarize_(rows);
  const laborSummary = summarizeLabor_(readLabor_().filter(r => String(r.date).startsWith(target)));
  const result = { ok: true, monthly: { month: target, date: '', ...sum, receivableBalance: 0, receivableCount: 0 }, dailySales: [], laborSummary, rows: rows.reverse() };
  cachePut_(key, result, 30);
  return result;
}
function getStats_(startDate, endDate) {
  const start = String(startDate || todayKst_()).slice(0, 10);
  const end = String(endDate || start).slice(0, 10);
  const key = 'stats:' + start + ':' + end;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const rows = readTransactions_().filter(r => between_(r.date, start, end));
  const personalRows = readPersonalExpenses_().filter(r => between_(r.date, start, end));
  const personal = summarizePersonal_(personalRows);
  const receivable = getReceivableSummary_();
  const result = { ok: true, stats: { startDate: start, endDate: end, date: '', ...summarize_(rows), receivableBalance: receivable.totalBalance, receivableCount: receivable.count, personal, rows: rows.reverse(), personalRows: personalRows.reverse() } };
  cachePut_(key, result, 30);
  return result;
}

function addTransaction_(data) {
  ensureTransactionHeader_();
  const id = data.id || makeId_('TX');
  const date = String(data.date || todayKst_()).slice(0, 10);
  const row = { date: date, type: data.type || '', method: data.method || '', amount: parseAmount_(data.amount), category: data.type === '지출' ? data.category || '' : '', memo: data.memo || '', id: id };
  sh_(SHEETS.transactions).appendRow([row.date, row.type, row.method, row.amount, row.category, row.memo, row.id]);
  adjustCumulativeCash_(row, 1);
  invalidateDate_(date);
  return { ok: true, id };
}
function updateTransaction_(id, data) {
  ensureTransactionHeader_();
  const sheet = sh_(SHEETS.transactions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'ID_NOT_FOUND' };
  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][6]) === String(id)) {
      const oldRow = mapTransactionRow_(values[i]);
      const date = String(data.date || todayKst_()).slice(0, 10);
      const nextRow = { date: date, type: data.type || '', method: data.method || '', amount: parseAmount_(data.amount), category: data.type === '지출' ? data.category || '' : '', memo: data.memo || '', id: String(id) };
      sheet.getRange(i + 2, 1, 1, 7).setValues([[nextRow.date, nextRow.type, nextRow.method, nextRow.amount, nextRow.category, nextRow.memo, nextRow.id]]);
      adjustCumulativeCash_(oldRow, -1);
      adjustCumulativeCash_(nextRow, 1);
      invalidateDate_(oldRow.date);
      invalidateDate_(nextRow.date);
      return { ok: true };
    }
  }
  return { ok: false, error: 'ID_NOT_FOUND' };
}
function deleteTransaction_(id) {
  ensureTransactionHeader_();
  const sheet = sh_(SHEETS.transactions);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'ID_NOT_FOUND' };
  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][6]) === String(id)) {
      const oldRow = mapTransactionRow_(values[i]);
      sheet.deleteRow(i + 2);
      adjustCumulativeCash_(oldRow, -1);
      invalidateDate_(oldRow.date || todayKst_());
      return { ok: true };
    }
  }
  return { ok: false, error: 'ID_NOT_FOUND' };
}
function getExpenseCategories_() {
  const cached = cacheGet_('categories');
  if (cached) return cached;
  const result = { ok: true, rows: EXPENSE_CATEGORIES.map((name, idx) => ({ name: name, active: 'Y', order: idx + 1 })) };
  cachePut_('categories', result, 3600);
  return result;
}

function getEmployees_() { const cached = cacheGet_('employees'); if (cached) return cached; ensureEmployees_(); const values = sh_(SHEETS.employees).getDataRange().getValues(); const result = { ok: true, rows: values.slice(1).filter(row => String(row[1] || '').toUpperCase() !== 'N').sort((a, b) => Number(a[2] || 0) - Number(b[2] || 0)).map(row => ({ name: String(row[0] || ''), active: String(row[1] || 'Y'), order: Number(row[2] || 0), id: String(row[3] || '') })) }; cachePut_('employees', result, 300); return result; }
function addEmployee_(name) { ensureEmployees_(); const sheet = sh_(SHEETS.employees); const values = sheet.getDataRange().getValues(); const order = Math.max(0, ...values.slice(1).map(row => Number(row[2] || 0))) + 1; const id = makeId_('EMP'); sheet.appendRow([String(name || '').trim(), 'Y', order, id]); cacheRemove_(['employees']); return { ok: true, id }; }
function deactivateEmployee_(id) { ensureEmployees_(); const sheet = sh_(SHEETS.employees); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][3]) === String(id)) { sheet.getRange(i + 1, 2).setValue('N'); cacheRemove_(['employees']); return { ok: true }; } return { ok: false, error: 'EMPLOYEE_NOT_FOUND' }; }

function mapLaborRow_(row) {
  return { date: formatDate_(row[0]), employee: String(row[1] || ''), tableNo: String(row[2] || ''), tc: Number(row[3] || 0), dailyPay: parseAmount_(row[4]), amount: Number(row[3] || 0) + parseAmount_(row[4]), memo: String(row[5] || ''), id: String(row[6] || ''), transactionId: String(row[7] || '') };
}
function readLabor_() {
  const cached = cacheGet_('labor:all');
  if (cached) return cached;
  ensureLaborHeader_();
  const sheet = sh_(SHEETS.labor);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const rows = values.filter(row => row.some(v => v !== '' && v !== null)).map(mapLaborRow_);
  cachePut_('labor:all', rows, 45);
  return rows;
}
function readLaborByDate_(date) {
  const target = String(date || todayKst_()).slice(0, 10);
  const key = 'labor:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  ensureLaborHeader_();
  const sheet = sh_(SHEETS.labor);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  const rows = [];
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    if (!row.some(v => v !== '' && v !== null)) continue;
    if (formatDate_(row[0]) === target) rows.push(mapLaborRow_(row));
  }
  cachePut_(key, rows, 45);
  return rows;
}
function summarizeLabor_(rows) { let totalTc = 0, totalAmount = 0; const map = {}; rows.forEach(row => { const tc = Number(row.tc || 0); const daily = parseAmount_(row.dailyPay || row.amount); const pay = tc + daily; totalTc += tc; totalAmount += pay; if (!map[row.employee]) map[row.employee] = { employee: row.employee, tc: 0, dailyPay: 0, amount: 0 }; map[row.employee].tc += tc; map[row.employee].dailyPay += daily; map[row.employee].amount += pay; }); return { totalTc, totalAmount, byEmployee: Object.keys(map).map(key => map[key]) }; }
function getLabor_(date) { const target = String(date || todayKst_()).slice(0, 10); const key = 'labor:result:' + target; const cached = cacheGet_(key); if (cached) return cached; const rows = readLaborByDate_(target); const result = { ok: true, rows, summary: summarizeLabor_(rows) }; cachePut_(key, result, 30); return result; }
function addLabor_(data) { ensureLaborHeader_(); const laborId = makeId_('LABOR'); const date = String(data.date || todayKst_()).slice(0, 10); const dailyPay = parseAmount_(data.dailyPay || data.amount); sh_(SHEETS.labor).appendRow([date, String(data.employee || ''), String(data.tableNo || ''), Number(data.tc || 0), dailyPay, String(data.memo || ''), laborId, '']); invalidateDate_(date); return { ok: true, id: laborId }; }
function updateLabor_(id, data) { ensureLaborHeader_(); const sheet = sh_(SHEETS.labor); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][6]) === String(id)) { const oldDate = formatDate_(values[i][0] || todayKst_()); const date = String(data.date || oldDate || todayKst_()).slice(0, 10); const dailyPay = parseAmount_(data.dailyPay || data.amount); sheet.getRange(i + 1, 1, 1, 8).setValues([[date, String(data.employee || ''), String(data.tableNo || ''), Number(data.tc || 0), dailyPay, String(data.memo || ''), String(id), String(values[i][7] || '')]]); invalidateDate_(oldDate); invalidateDate_(date); return { ok: true }; } return { ok: false, error: 'LABOR_NOT_FOUND' }; }
function deleteLabor_(id) { ensureLaborHeader_(); const sheet = sh_(SHEETS.labor); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][6]) === String(id)) { const date = values[i][0] || todayKst_(); sheet.deleteRow(i + 1); invalidateDate_(date); return { ok: true }; } return { ok: false, error: 'LABOR_NOT_FOUND' }; }

function readReceivables_() {
  const cached = cacheGet_('receivables:raw');
  if (cached) return cached;
  ensureReceivableHeader_();
  const sheet = sh_(SHEETS.receivables);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const rows = values.filter(row => row.some(v => v !== '' && v !== null)).map(row => ({
    date: formatDate_(row[0]),
    name: String(row[1] || ''),
    phone: String(row[2] || ''),
    amount: parseAmount_(row[3]),
    paid: parseAmount_(row[4]),
    balance: parseAmount_(row[5]),
    status: String(row[6] || '미수'),
    memo: String(row[7] || ''),
    id: String(row[8] || ''),
    payments: []
  }));
  cachePut_('receivables:raw', rows, 45);
  return rows;
}
function readReceivablePayments_() {
  const cached = cacheGet_('receivables:payments');
  if (cached) return cached;
  ensureReceivablePaymentHeader_();
  const sheet = sh_(SHEETS.receivablePayments);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const rows = values.filter(row => row.some(v => v !== '' && v !== null)).map(row => ({
    date: formatDate_(row[0]),
    receivableId: String(row[1] || ''),
    name: String(row[2] || ''),
    status: String(row[3] || ''),
    method: String(row[4] || ''),
    amount: parseAmount_(row[5]),
    balance: parseAmount_(row[6]),
    memo: String(row[7] || ''),
    id: String(row[8] || ''),
    transactionId: String(row[9] || '')
  }));
  cachePut_('receivables:payments', rows, 45);
  return rows;
}
function summarizeReceivables_(rows) {
  let totalAmount = 0, totalPaid = 0, totalBalance = 0, openCount = 0, closedCount = 0;
  rows.forEach(row => {
    totalAmount += row.amount;
    totalPaid += row.paid;
    if (row.status !== '완납' && row.balance > 0) { totalBalance += row.balance; openCount++; }
    else closedCount++;
  });
  return { totalAmount, totalPaid, totalBalance, openCount, closedCount, count: openCount, paidTotal: totalPaid };
}
function attachReceivablePayments_(rows) {
  const payments = readReceivablePayments_();
  const byId = {};
  payments.forEach(p => {
    if (!byId[p.receivableId]) byId[p.receivableId] = [];
    byId[p.receivableId].push(p);
  });
  return rows.map(row => ({ ...row, payments: (byId[row.id] || []).slice().reverse() }));
}
function getReceivableSummary_() { const cached = cacheGet_('receivableSummary'); if (cached) return cached; const result = summarizeReceivables_(readReceivables_()); cachePut_('receivableSummary', result, 60); return result; }
function getReceivables_() {
  const cached = cacheGet_('receivables');
  if (cached) return cached;
  const rawRows = readReceivables_();
  const rows = attachReceivablePayments_(rawRows).reverse();
  const result = { ok: true, rows, summary: summarizeReceivables_(rawRows) };
  cachePut_('receivables', result, 20);
  return result;
}
function calcStatus_(balance, amount) { if (balance <= 0) return '완납'; if (balance < amount) return '일부입금'; return '미수'; }
function addReceivable_(data) {
  ensureReceivableHeader_();
  const amount = parseAmount_(data.amount);
  const paid = parseAmount_(data.paid);
  const balance = Math.max(0, amount - paid);
  const id = makeId_('RCV');
  const date = String(data.date || todayKst_()).slice(0, 10);
  sh_(SHEETS.receivables).appendRow([date, data.name || '', data.phone || '', amount, paid, balance, calcStatus_(balance, amount), data.memo || '', id]);
  cacheRemove_(['receivables', 'receivableSummary']);
  invalidateDate_(date);
  return { ok: true, id };
}
function updateReceivable_(id, data) {
  return updateReceivableRow_(id, row => {
    const amount = parseAmount_(data.amount);
    const paid = parseAmount_(data.paid);
    const balance = Math.max(0, amount - paid);
    return { ...row, date: String(data.date || row.date || todayKst_()).slice(0, 10), name: data.name || '', phone: data.phone || '', amount, paid, balance, status: calcStatus_(balance, amount), memo: data.memo || '' };
  });
}
function updateReceivableRow_(id, updater) {
  ensureReceivableHeader_();
  const sheet = sh_(SHEETS.receivables);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) if (String(values[i][8]) === String(id)) {
    const row = { date: formatDate_(values[i][0]), name: String(values[i][1] || ''), phone: String(values[i][2] || ''), amount: parseAmount_(values[i][3]), paid: parseAmount_(values[i][4]), balance: parseAmount_(values[i][5]), status: String(values[i][6] || '미수'), memo: String(values[i][7] || ''), id: String(values[i][8] || '') };
    const next = updater(row);
    sheet.getRange(i + 1, 1, 1, 9).setValues([[next.date, next.name, next.phone, next.amount, next.paid, next.balance, next.status, next.memo, next.id]]);
    cacheRemove_(['receivables', 'receivableSummary']);
    invalidateDate_(next.date);
    return { ok: true, row: next };
  }
  return { ok: false, error: 'RECEIVABLE_NOT_FOUND' };
}
function appendReceivablePayment_(data) {
  ensureReceivablePaymentHeader_();
  const id = data.id || makeId_('RPAY');
  sh_(SHEETS.receivablePayments).appendRow([data.date, data.receivableId, data.name, data.status, data.method, data.amount, data.balance, data.memo || '', id, data.transactionId || '']);
  return id;
}
function appendReceivableSalesTransaction_(data) {
  ensureTransactionHeader_();
  const txId = data.id || makeId_('TX-RCV');
  const row = { date: data.date, type: '매출', method: data.method, amount: parseAmount_(data.amount), category: '', memo: data.memo || '', id: txId };
  sh_(SHEETS.transactions).appendRow([row.date, row.type, row.method, row.amount, row.category, row.memo, row.id]);
  adjustCumulativeCash_(row, 1);
  invalidateDate_(row.date);
  return txId;
}
function normalizePaymentMethod_(method) {
  const m = String(method || '').trim();
  if (m === '카드' || m === '현금' || m === '계좌') return m;
  return '현금';
}
function payReceivable_(id, paid, method, memo) {
  ensureReceivableHeader_();
  ensureReceivablePaymentHeader_();
  ensureTransactionHeader_();
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const sheet = sh_(SHEETS.receivables);
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) if (String(values[i][8]) === String(id)) {
      const row = { date: formatDate_(values[i][0]), name: String(values[i][1] || ''), phone: String(values[i][2] || ''), amount: parseAmount_(values[i][3]), paid: parseAmount_(values[i][4]), balance: parseAmount_(values[i][5]), status: String(values[i][6] || '미수'), memo: String(values[i][7] || ''), id: String(values[i][8] || '') };
      const requested = parseAmount_(paid);
      const payAmount = Math.min(Math.max(0, requested), Math.max(0, row.balance));
      if (payAmount <= 0) return { ok: false, error: 'INVALID_PAYMENT_AMOUNT' };
      const paymentMethod = normalizePaymentMethod_(method);
      const date = todayKst_();
      const nextPaid = row.paid + payAmount;
      const nextBalance = Math.max(0, row.amount - nextPaid);
      const nextStatus = calcStatus_(nextBalance, row.amount);
      const memoText = String(memo || '').trim();
      const txMemo = ['미수금 ' + nextStatus, row.name, memoText, '잔액 ' + nextBalance].filter(Boolean).join(' / ');
      const txId = appendReceivableSalesTransaction_({ date, method: paymentMethod, amount: payAmount, memo: txMemo });
      const paymentId = appendReceivablePayment_({ date, receivableId: row.id, name: row.name, status: nextStatus, method: paymentMethod, amount: payAmount, balance: nextBalance, memo: memoText, transactionId: txId });
      sheet.getRange(i + 1, 5, 1, 3).setValues([[nextPaid, nextBalance, nextStatus]]);
      cacheRemove_(['receivables', 'receivableSummary']);
      invalidateDate_(date);
      invalidateDate_(row.date);
      return { ok: true, id: paymentId, transactionId: txId, paid: nextPaid, balance: nextBalance, status: nextStatus };
    }
    return { ok: false, error: 'RECEIVABLE_NOT_FOUND' };
  } finally {
    lock.releaseLock();
  }
}
function completeReceivable_(id, method, memo) {
  ensureReceivableHeader_();
  const values = sh_(SHEETS.receivables).getDataRange().getValues();
  for (let i = 1; i < values.length; i++) if (String(values[i][8]) === String(id)) {
    const balance = parseAmount_(values[i][5]);
    return payReceivable_(id, balance, method, memo || '완납');
  }
  return { ok: false, error: 'RECEIVABLE_NOT_FOUND' };
}
function deleteReceivable_(id) {
  ensureReceivableHeader_();
  const sheet = sh_(SHEETS.receivables);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) if (String(values[i][8]) === String(id)) {
    cacheRemove_(['receivables', 'receivableSummary']);
    invalidateDate_(values[i][0] || todayKst_());
    sheet.deleteRow(i + 1);
    return { ok: true };
  }
  return { ok: false, error: 'RECEIVABLE_NOT_FOUND' };
}

function mapPersonalRow_(row) {
  return { date: formatDate_(row[0]), owner: String(row[1] || ''), method: String(row[2] || ''), amount: parseAmount_(row[3]), memo: String(row[4] || ''), id: String(row[5] || '') };
}
function readPersonalExpenses_() {
  const cached = cacheGet_('personal:all');
  if (cached) return cached;
  ensurePersonalHeader_();
  const sheet = sh_(SHEETS.personal);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const rows = values.filter(row => row.some(v => v !== '' && v !== null)).map(mapPersonalRow_);
  cachePut_('personal:all', rows, 45);
  return rows;
}
function readPersonalByDate_(date) {
  const target = String(date || todayKst_()).slice(0, 10);
  const key = 'personal:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  ensurePersonalHeader_();
  const sheet = sh_(SHEETS.personal);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const rows = [];
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    if (!row.some(v => v !== '' && v !== null)) continue;
    if (formatDate_(row[0]) === target) rows.push(mapPersonalRow_(row));
  }
  cachePut_(key, rows, 45);
  return rows;
}
function summarizePersonal_(rows) { let total = 0, yeonju = 0, gwansu = 0; rows.forEach(row => { const amount = parseAmount_(row.amount); total += amount; if (row.owner === '연주') yeonju += amount; if (row.owner === '관수') gwansu += amount; }); return { total, yeonju, gwansu }; }
function getPersonalExpenses_(date) { const target = String(date || todayKst_()).slice(0, 10); const key = 'personal:result:' + target; const cached = cacheGet_(key); if (cached) return cached; const rows = readPersonalByDate_(target); const result = { ok: true, rows, summary: summarizePersonal_(rows) }; cachePut_(key, result, 30); return result; }
function addPersonalExpense_(data) { ensurePersonalHeader_(); const id = makeId_('PEX'); const date = String(data.date || todayKst_()).slice(0, 10); sh_(SHEETS.personal).appendRow([date, String(data.owner || ''), String(data.method || ''), parseAmount_(data.amount), String(data.memo || ''), id]); invalidateDate_(date); return { ok: true, id }; }
function deletePersonalExpense_(id) { ensurePersonalHeader_(); const sheet = sh_(SHEETS.personal); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][5]) === String(id)) { const date = values[i][0] || todayKst_(); sheet.deleteRow(i + 1); invalidateDate_(date); return { ok: true }; } return { ok: false, error: 'PERSONAL_NOT_FOUND' }; }
