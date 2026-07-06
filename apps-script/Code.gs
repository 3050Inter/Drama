const SPREADSHEET_ID = '1p7BXYTvc9o3MLFbW4C2R_6KqEe5YPen70OqtGP08j3E';

const SHEETS = {
  transactions: '거래내역',
  categories: '지출항목',
  labor: '인건비_DB',
  employees: '직원_DB',
  receivables: '미수금_DB',
  personal: '개인지출_DB',
};

const EXPENSE_CATEGORIES = ['인건비', '마스터', '안주', '안주재료', '비품', '주류,음료', '공과금', '월세', '카드결제현금지급', '기타지출'];

function doGet(e) {
  try {
    const p = e.parameter || {};
    const action = p.action || 'ping';
    if (action === 'ping') return json({ ok: true, message: 'DRAMA API OK' });
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
    if (action === 'deleteLabor') return json(deleteLabor_(body.id));
    if (action === 'addReceivable') return json(addReceivable_(body.data));
    if (action === 'updateReceivable') return json(updateReceivable_(body.id, body.data));
    if (action === 'payReceivable') return json(payReceivable_(body.id, body.paid));
    if (action === 'completeReceivable') return json(completeReceivable_(body.id));
    if (action === 'deleteReceivable') return json(deleteReceivable_(body.id));
    if (action === 'addPersonalExpense') return json(addPersonalExpense_(body.data));
    if (action === 'deletePersonalExpense') return json(deletePersonalExpense_(body.id));
    return json({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function ss_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sh_(name) { let sheet = ss_().getSheetByName(name); if (!sheet) sheet = ss_().insertSheet(name); return sheet; }
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
  cacheRemove_(['home:' + d, 'dashboard:' + d, 'transactions:' + d, 'monthly:' + m, 'labor:' + d, 'personal:' + d, 'receivables']);
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
  ensureTransactionHeader_();
  const values = sh_(SHEETS.transactions).getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1).filter(row => row.some(v => v !== '' && v !== null)).map(row => ({
    date: formatDate_(row[0]), type: String(row[1] || ''), method: String(row[2] || ''), amount: parseAmount_(row[3]), category: String(row[4] || ''), memo: String(row[5] || ''), id: String(row[6] || '')
  }));
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
function cumulativeCashAll_() { return cumulativeCashAllFrom_(readTransactions_()); }
function getHome_(date) {
  const target = date || todayKst_();
  const key = 'home:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const allRows = readTransactions_();
  const rows = allRows.filter(r => r.date === target);
  const receivable = getReceivableSummary_();
  const result = { ok: true, dashboard: { date: target, ...summarize_(rows), cumulativeCash: cumulativeCashAllFrom_(allRows), receivableBalance: receivable.totalBalance, receivableCount: receivable.count }, rows: rows.slice().reverse() };
  cachePut_(key, result, 15);
  return result;
}
function getDashboard_(date) {
  const target = date || todayKst_();
  const key = 'dashboard:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const allRows = readTransactions_();
  const rows = allRows.filter(r => r.date === target);
  const receivable = getReceivableSummary_();
  const result = { ok: true, dashboard: { date: target, ...summarize_(rows), cumulativeCash: cumulativeCashAllFrom_(allRows), receivableBalance: receivable.totalBalance, receivableCount: receivable.count } };
  cachePut_(key, result, 15);
  return result;
}
function getTransactions_(date) {
  const target = date || todayKst_();
  const key = 'transactions:' + target;
  const cached = cacheGet_(key);
  if (cached) return cached;
  const result = { ok: true, rows: readTransactions_().filter(r => r.date === target).reverse() };
  cachePut_(key, result, 15);
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
  sh_(SHEETS.transactions).appendRow([date, data.type || '', data.method || '', parseAmount_(data.amount), data.type === '지출' ? data.category || '' : '', data.memo || '', id]);
  invalidateDate_(date);
  return { ok: true, id };
}
function updateTransaction_(id, data) {
  ensureTransactionHeader_();
  const sheet = sh_(SHEETS.transactions); const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) if (String(values[i][6]) === String(id)) { const date = String(data.date || todayKst_()).slice(0, 10); sheet.getRange(i + 1, 1, 1, 7).setValues([[date, data.type || '', data.method || '', parseAmount_(data.amount), data.type === '지출' ? data.category || '' : '', data.memo || '', id]]); invalidateDate_(date); return { ok: true }; }
  return { ok: false, error: 'ID_NOT_FOUND' };
}
function deleteTransaction_(id) { ensureTransactionHeader_(); const sheet = sh_(SHEETS.transactions); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][6]) === String(id)) { invalidateDate_(values[i][0] || todayKst_()); sheet.deleteRow(i + 1); return { ok: true }; } return { ok: false, error: 'ID_NOT_FOUND' }; }
function getExpenseCategories_() { const cached = cacheGet_('categories'); if (cached) return cached; ensureCategories_(); const values = sh_(SHEETS.categories).getDataRange().getValues(); const result = { ok: true, rows: values.slice(1).filter(row => String(row[1] || '').toUpperCase() !== 'N').sort((a, b) => Number(a[2] || 0) - Number(b[2] || 0)).map(row => ({ name: String(row[0] || ''), active: String(row[1] || 'Y'), order: Number(row[2] || 0) })) }; cachePut_('categories', result, 300); return result; }

function getEmployees_() { const cached = cacheGet_('employees'); if (cached) return cached; ensureEmployees_(); const values = sh_(SHEETS.employees).getDataRange().getValues(); const result = { ok: true, rows: values.slice(1).filter(row => String(row[1] || '').toUpperCase() !== 'N').sort((a, b) => Number(a[2] || 0) - Number(b[2] || 0)).map(row => ({ name: String(row[0] || ''), active: String(row[1] || 'Y'), order: Number(row[2] || 0), id: String(row[3] || '') })) }; cachePut_('employees', result, 300); return result; }
function addEmployee_(name) { ensureEmployees_(); const sheet = sh_(SHEETS.employees); const values = sheet.getDataRange().getValues(); const order = Math.max(0, ...values.slice(1).map(row => Number(row[2] || 0))) + 1; const id = makeId_('EMP'); sheet.appendRow([String(name || '').trim(), 'Y', order, id]); cacheRemove_(['employees']); return { ok: true, id }; }
function deactivateEmployee_(id) { ensureEmployees_(); const sheet = sh_(SHEETS.employees); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][3]) === String(id)) { sheet.getRange(i + 1, 2).setValue('N'); cacheRemove_(['employees']); return { ok: true }; } return { ok: false, error: 'EMPLOYEE_NOT_FOUND' }; }

function readLabor_() { ensureLaborHeader_(); const values = sh_(SHEETS.labor).getDataRange().getValues(); if (values.length < 2) return []; return values.slice(1).filter(row => row.some(v => v !== '' && v !== null)).map(row => ({ date: formatDate_(row[0]), employee: String(row[1] || ''), tableNo: String(row[2] || ''), tc: Number(row[3] || 0), dailyPay: parseAmount_(row[4]), amount: parseAmount_(row[4]), memo: String(row[5] || ''), id: String(row[6] || ''), transactionId: String(row[7] || '') })); }
function summarizeLabor_(rows) { let totalTc = 0, totalAmount = 0; const map = {}; rows.forEach(row => { const tc = Number(row.tc || 0); const daily = parseAmount_(row.dailyPay || row.amount); const pay = tc + daily; totalTc += tc; totalAmount += pay; if (!map[row.employee]) map[row.employee] = { employee: row.employee, tc: 0, dailyPay: 0, amount: 0 }; map[row.employee].tc += tc; map[row.employee].dailyPay += daily; map[row.employee].amount += pay; }); return { totalTc, totalAmount, byEmployee: Object.keys(map).map(key => map[key]) }; }
function getLabor_(date) { const target = date || todayKst_(); const key = 'labor:' + target; const cached = cacheGet_(key); if (cached) return cached; const rows = readLabor_().filter(row => row.date === target).reverse(); const result = { ok: true, rows, summary: summarizeLabor_(rows) }; cachePut_(key, result, 15); return result; }
function addLabor_(data) { ensureLaborHeader_(); const laborId = makeId_('LABOR'); const date = String(data.date || todayKst_()).slice(0, 10); const dailyPay = parseAmount_(data.dailyPay || data.amount); sh_(SHEETS.labor).appendRow([date, String(data.employee || ''), String(data.tableNo || ''), Number(data.tc || 0), dailyPay, String(data.memo || ''), laborId, '']); invalidateDate_(date); return { ok: true, id: laborId }; }
function deleteLabor_(id) { ensureLaborHeader_(); const sheet = sh_(SHEETS.labor); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][6]) === String(id)) { const date = values[i][0] || todayKst_(); sheet.deleteRow(i + 1); invalidateDate_(date); return { ok: true }; } return { ok: false, error: 'LABOR_NOT_FOUND' }; }

function readReceivables_() { ensureReceivableHeader_(); const values = sh_(SHEETS.receivables).getDataRange().getValues(); if (values.length < 2) return []; return values.slice(1).filter(row => row.some(v => v !== '' && v !== null)).map(row => ({ date: formatDate_(row[0]), name: String(row[1] || ''), phone: String(row[2] || ''), amount: parseAmount_(row[3]), paid: parseAmount_(row[4]), balance: parseAmount_(row[5]), status: String(row[6] || '미수'), memo: String(row[7] || ''), id: String(row[8] || '') })); }
function getReceivableSummary_() { const rows = readReceivables_(); let totalAmount = 0, totalPaid = 0, totalBalance = 0, openCount = 0, closedCount = 0; rows.forEach(row => { totalAmount += row.amount; totalPaid += row.paid; if (row.status !== '완납' && row.balance > 0) { totalBalance += row.balance; openCount++; } else closedCount++; }); return { totalAmount, totalPaid, totalBalance, openCount, closedCount, count: openCount, paidTotal: totalPaid }; }
function getReceivables_() { const cached = cacheGet_('receivables'); if (cached) return cached; const rows = readReceivables_().reverse(); const result = { ok: true, rows, summary: getReceivableSummary_() }; cachePut_('receivables', result, 20); return result; }
function calcStatus_(balance, amount) { if (balance <= 0) return '완납'; if (balance < amount) return '일부입금'; return '미수'; }
function addReceivable_(data) { ensureReceivableHeader_(); const amount = parseAmount_(data.amount); const paid = parseAmount_(data.paid); const balance = Math.max(0, amount - paid); const id = makeId_('RCV'); const date = String(data.date || todayKst_()).slice(0, 10); sh_(SHEETS.receivables).appendRow([date, data.name || '', data.phone || '', amount, paid, balance, calcStatus_(balance, amount), data.memo || '', id]); cacheRemove_(['receivables']); invalidateDate_(date); return { ok: true, id }; }
function updateReceivable_(id, data) { return updateReceivableRow_(id, row => { const amount = parseAmount_(data.amount); const paid = parseAmount_(data.paid); const balance = Math.max(0, amount - paid); return { ...row, date: String(data.date || row.date || todayKst_()).slice(0, 10), name: data.name || '', phone: data.phone || '', amount, paid, balance, status: calcStatus_(balance, amount), memo: data.memo || '' }; }); }
function updateReceivableRow_(id, updater) { ensureReceivableHeader_(); const sheet = sh_(SHEETS.receivables); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][8]) === String(id)) { const row = { date: formatDate_(values[i][0]), name: String(values[i][1] || ''), phone: String(values[i][2] || ''), amount: parseAmount_(values[i][3]), paid: parseAmount_(values[i][4]), balance: parseAmount_(values[i][5]), status: String(values[i][6] || '미수'), memo: String(values[i][7] || ''), id: String(values[i][8] || '') }; const next = updater(row); sheet.getRange(i + 1, 1, 1, 9).setValues([[next.date, next.name, next.phone, next.amount, next.paid, next.balance, next.status, next.memo, next.id]]); cacheRemove_(['receivables']); invalidateDate_(next.date); return { ok: true }; } return { ok: false, error: 'RECEIVABLE_NOT_FOUND' }; }
function payReceivable_(id, paid) { return updateReceivableRow_(id, row => { const nextPaid = row.paid + parseAmount_(paid); const nextBalance = Math.max(0, row.amount - nextPaid); return { ...row, paid: nextPaid, balance: nextBalance, status: calcStatus_(nextBalance, row.amount) }; }); }
function completeReceivable_(id) { return updateReceivableRow_(id, row => ({ ...row, paid: row.amount, balance: 0, status: '완납' })); }
function deleteReceivable_(id) { ensureReceivableHeader_(); const sheet = sh_(SHEETS.receivables); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][8]) === String(id)) { cacheRemove_(['receivables']); invalidateDate_(values[i][0] || todayKst_()); sheet.deleteRow(i + 1); return { ok: true }; } return { ok: false, error: 'RECEIVABLE_NOT_FOUND' }; }

function readPersonalExpenses_() { ensurePersonalHeader_(); const values = sh_(SHEETS.personal).getDataRange().getValues(); if (values.length < 2) return []; return values.slice(1).filter(row => row.some(v => v !== '' && v !== null)).map(row => ({ date: formatDate_(row[0]), owner: String(row[1] || ''), method: String(row[2] || ''), amount: parseAmount_(row[3]), memo: String(row[4] || ''), id: String(row[5] || '') })); }
function summarizePersonal_(rows) { let total = 0, yeonju = 0, gwansu = 0; rows.forEach(row => { const amount = parseAmount_(row.amount); total += amount; if (row.owner === '연주') yeonju += amount; if (row.owner === '관수') gwansu += amount; }); return { total, yeonju, gwansu }; }
function getPersonalExpenses_(date) { const target = date || todayKst_(); const key = 'personal:' + target; const cached = cacheGet_(key); if (cached) return cached; const rows = readPersonalExpenses_().filter(row => row.date === target).reverse(); const result = { ok: true, rows, summary: summarizePersonal_(rows) }; cachePut_(key, result, 15); return result; }
function addPersonalExpense_(data) { ensurePersonalHeader_(); const id = makeId_('PEX'); const date = String(data.date || todayKst_()).slice(0, 10); sh_(SHEETS.personal).appendRow([date, String(data.owner || ''), String(data.method || ''), parseAmount_(data.amount), String(data.memo || ''), id]); invalidateDate_(date); return { ok: true, id }; }
function deletePersonalExpense_(id) { ensurePersonalHeader_(); const sheet = sh_(SHEETS.personal); const values = sheet.getDataRange().getValues(); for (let i = 1; i < values.length; i++) if (String(values[i][5]) === String(id)) { const date = values[i][0] || todayKst_(); sheet.deleteRow(i + 1); invalidateDate_(date); return { ok: true }; } return { ok: false, error: 'PERSONAL_NOT_FOUND' }; }
