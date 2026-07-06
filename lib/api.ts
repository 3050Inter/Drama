import type {
  Dashboard,
  DailySales,
  Employee,
  ExpenseCategory,
  LaborEntry,
  LaborSummaryByEmployee,
  MonthlySummary,
  PaymentMethod,
  Receivable,
  ReceivableSummary,
  Transaction,
  TransactionType,
} from "./types";

// Apps Script 웹앱 배포 후 /exec URL을 여기에 붙여넣으세요.
export const API_URL: string = "https://script.google.com/macros/s/AKfycbwFp7piFkt36NMRF9PNAyM-8j5MSfJs5o0mya1oH9-Q_cUV-QZvaj7-KQ0-PQvCUfK6iQ/exec";

type ApiResult<T> = { ok: boolean; error?: string } & T;

function hasApiUrl() {
  return API_URL.startsWith("https://script.google.com/");
}

async function getJson<T>(action: string, params?: Record<string, string>) {
  if (!hasApiUrl()) throw new Error("API_URL_EMPTY");
  const query = new URLSearchParams({ action, ...(params || {}) });
  const res = await fetch(`${API_URL}?${query.toString()}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("API 요청 실패");
  return res.json() as Promise<T>;
}

async function postJson<T>(body: unknown) {
  if (!hasApiUrl()) throw new Error("API_URL_EMPTY");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("API 요청 실패");
  return res.json() as Promise<T>;
}

export const getHome = (date: string) =>
  getJson<ApiResult<{ dashboard: Dashboard; rows: Transaction[] }>>("home", { date });

export const getDashboard = (date: string) =>
  getJson<ApiResult<{ dashboard: Dashboard }>>("dashboard", { date });

export const getTransactions = (date: string) =>
  getJson<ApiResult<{ rows: Transaction[] }>>("transactions", { date });

export const getMonthly = (month: string) =>
  getJson<ApiResult<{
    monthly: MonthlySummary;
    dailySales: DailySales[];
    laborSummary: { totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] };
  }>>("monthly", { month });

export const getExpenseCategories = () =>
  getJson<ApiResult<{ rows: ExpenseCategory[] }>>("categories");

export const addTransaction = (data: {
  date: string;
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  category: string;
  memo: string;
}) => postJson<ApiResult<{ id?: string }>>({ action: "addTransaction", data });

export const updateTransaction = (
  id: string,
  data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }
) => postJson<ApiResult<Record<string, never>>>({ action: "updateTransaction", id, data });

export const deleteTransaction = (id: string) =>
  postJson<ApiResult<Record<string, never>>>({ action: "deleteTransaction", id });

export const getEmployees = () =>
  getJson<ApiResult<{ rows: Employee[] }>>("employees");

export const addEmployee = (name: string) =>
  postJson<ApiResult<{ id?: string }>>({ action: "addEmployee", name });

export const deactivateEmployee = (id: string) =>
  postJson<ApiResult<Record<string, never>>>({ action: "deactivateEmployee", id });

export const getLabor = (date: string) =>
  getJson<ApiResult<{
    rows: LaborEntry[];
    summary: { totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] };
  }>>("labor", { date });

export const addLabor = (data: {
  date: string;
  employee: string;
  tableNo: string;
  tc: number;
  amount: number;
  memo: string;
}) => postJson<ApiResult<{ id?: string; transactionId?: string }>>({ action: "addLabor", data });

export const deleteLabor = (id: string) =>
  postJson<ApiResult<Record<string, never>>>({ action: "deleteLabor", id });

export const getReceivables = () =>
  getJson<ApiResult<{ rows: Receivable[]; summary: ReceivableSummary }>>("receivables");

export const addReceivable = (data: {
  date: string;
  name: string;
  phone: string;
  amount: number;
  paid?: number;
  memo: string;
}) => postJson<ApiResult<{ id?: string }>>({ action: "addReceivable", data });

export const updateReceivable = (
  id: string,
  data: {
    date: string;
    name: string;
    phone: string;
    amount: number;
    paid: number;
    memo: string;
  }
) => postJson<ApiResult<Record<string, never>>>({ action: "updateReceivable", id, data });

export const payReceivable = (id: string, paid: number) =>
  postJson<ApiResult<Record<string, never>>>({ action: "payReceivable", id, paid });

export const completeReceivable = (id: string) =>
  postJson<ApiResult<Record<string, never>>>({ action: "completeReceivable", id });

export const deleteReceivable = (id: string) =>
  postJson<ApiResult<Record<string, never>>>({ action: "deleteReceivable", id });
