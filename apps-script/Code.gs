const SPREADSHEET_ID = '1p7BXYTvc9o3MLFbW4C2R_6KqEe5YPen70OqtGP08j3E';

const SHEETS = {
  transactions: '거래내역',
  categories: '지출항목',
};

function doGet(e) {
  try {
    const action = e.parameter.action || 'ping';
    if (action === 'ping') return json({ ok: true, message: 'DRAMA API OK' });
    if (action === 'dashboard') return json(getDashboard_(e.parameter.date));
    if (action === 'transactions') return json(getTransactions_(e.parameter.date));
    if (action === 'monthly') return json(getMonthly_(e.parameter.month));
    if (action === 'categories') return json(getExpenseCategories_());
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
    return json({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function ss_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sh_(name) { const sheet = ss_().getSheetByName(name); if (!sheet) throw new Error('시트를 찾을 수 없습니다: ' + name); return sheet; }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function todayKst_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function makeId_() { return 'TX-' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 10000); }

function ensureHeader_() {
  const sheet = sh_(SHEETS.transactions);
  const headers = ['날짜', '구분', '결제', '금액', '지출항목', '메모', 'ID'];
  if (sheet.getLastRow() === 0) { sheet.appendRow(headers); return; }
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (String(firstRow[0]) !== '날짜') { sheet.clear(); sheet.appendRow(headers); }
}

function formatDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd');
  return String(value || '');
}

function readTransactions_() {
  ensureHeader_();
  const sheet = sh_(SHEETS.transactions);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1).filter(row => row.some(v => v !== '' && v !== null)).map(row => ({
    date: formatDate_(row[0]),
    type: String(row[1] || ''),
    method: String(row[2] || ''),
    amount: Number(row[3] || 0),
    category: String(row[4] || ''),
    memo: String(row[5] || ''),
    id: String(row[6] || ''),
  }));
}

function summarize_(rows) {
  let totalSales = 0, totalExpense = 0, cardSales = 0, cashSales = 0, bankSales = 0;
  rows.forEach(r => {
    const amount = Number(r.amount || 0);
    if (r.type === '매출') {
      totalSales += amount;
      if (r.method === '카드') cardSales += amount;
      if (r.method === '현금') cashSales += amount;
      if (r.method === '계좌') bankSales += amount;
    }
    if (r.type === '지출') totalExpense += amount;
  });
  return { totalSales, totalExpense, profit: totalSales - totalExpense, cardSales, cashSales, bankSales, transactionCount: rows.length };
}

function getDashboard_(date) {
  const targetDate = date || todayKst_();
  const rows = readTransactions_().filter(r => r.date === targetDate);
  return { ok: true, dashboard: { date: targetDate, ...summarize_(rows) } };
}

function getTransactions_(date) {
  const targetDate = date || todayKst_();
  const rows = readTransactions_().filter(r => r.date === targetDate).reverse();
  return { ok: true, rows };
}

function getMonthly_(month) {
  const targetMonth = month || todayKst_().slice(0, 7);
  const rows = readTransactions_().filter(r => String(r.date).startsWith(targetMonth));
  return { ok: true, monthly: { month: targetMonth, ...summarize_(rows) }, rows: rows.reverse() };
}

function addTransaction_(data) {
  ensureHeader_();
  const id = makeId_();
  sh_(SHEETS.transactions).appendRow([
    data.date || todayKst_(),
    data.type || '',
    data.method || '',
    Number(data.amount || 0),
    data.type === '지출' ? data.category || '' : '',
    data.memo || '',
    id,
  ]);
  return { ok: true, id };
}

function updateTransaction_(id, data) {
  ensureHeader_();
  const sheet = sh_(SHEETS.transactions);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][6]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, 6).setValues([[data.date || '', data.type || '', data.method || '', Number(data.amount || 0), data.type === '지출' ? data.category || '' : '', data.memo || '']]);
      return { ok: true };
    }
  }
  return { ok: false, error: 'ID_NOT_FOUND' };
}

function deleteTransaction_(id) {
  ensureHeader_();
  const sheet = sh_(SHEETS.transactions);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][6]) === String(id)) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: false, error: 'ID_NOT_FOUND' };
}

function getExpenseCategories_() {
  let sheet = ss_().getSheetByName(SHEETS.categories);
  if (!sheet) {
    sheet = ss_().insertSheet(SHEETS.categories);
    sheet.appendRow(['항목명', '사용여부', '정렬']);
    [['주류매입','Y',1],['안주재료','Y',2],['인건비','Y',3],['월세','Y',4],['공과금','Y',5],['비품','Y',6],['기타지출','Y',7]].forEach(row => sheet.appendRow(row));
  }
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, rows: [] };
  const rows = values.slice(1).filter(row => String(row[1] || '').toUpperCase() !== 'N').sort((a,b)=>Number(a[2]||0)-Number(b[2]||0)).map(row => ({ name: String(row[0] || ''), active: String(row[1] || 'Y'), order: Number(row[2] || 0) }));
  return { ok: true, rows };
}
