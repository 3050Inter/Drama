import type {
  Dashboard,
  Employee,
  ExpenseCategory,
  LaborEntry,
  LaborSummaryByEmployee,
  PaymentMethod,
  PersonalExpense,
  PersonalExpenseSummary,
  Receivable,
  ReceivableSummary,
  StatsSummary,
  MonthlySummary,
  DailySales,
  Transaction,
  TransactionType,
} from "./types";

export const API_URL: string = "https://script.google.com/macros/s/AKfycbwFp7piFkt36NMRF9PNAyM-8j5MSfJs5o0mya1oH9-Q_cUV-QZvaj7-KQ0-PQvCUfK6iQ/exec";

type ApiResult<T> = { ok: boolean; error?: string } & T;
function hasApiUrl() { return API_URL.startsWith("https://script.google.com/"); }
async function getJson<T>(action: string, params?: Record<string, string>) {
  if (!hasApiUrl()) throw new Error("API_URL_EMPTY");
  const query = new URLSearchParams({ action, ...(params || {}) });
  const res = await fetch(`${API_URL}?${query.toString()}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("API 요청 실패");
  return res.json() as Promise<T>;
}
async function postJson<T>(body: unknown) {
  if (!hasApiUrl()) throw new Error("API_URL_EMPTY");
  const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("API 요청 실패");
  return res.json() as Promise<T>;
}

export const getHome = (date: string) => getJson<ApiResult<{ dashboard: Dashboard; rows: Transaction[]; categories?: ExpenseCategory[] }>>("home", { date });
export const getTransactions = (date: string) => getJson<ApiResult<{ rows: Transaction[] }>>("transactions", { date });
export const getStats = (startDate: string, endDate: string) => getJson<ApiResult<{ stats: StatsSummary }>>("stats", { startDate, endDate });
export const getMonthly = (month: string) => getJson<ApiResult<{ monthly: MonthlySummary; dailySales: DailySales[]; laborSummary: { totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] }; rows: Transaction[] }>>("monthly", { month });
let categoryCache: ApiResult<{ rows: ExpenseCategory[] }> | null = null;
let categoryPromise: Promise<ApiResult<{ rows: ExpenseCategory[] }>> | null = null;
export const getExpenseCategories = async () => {
  if (categoryCache) return categoryCache;
  if (!categoryPromise) {
    categoryPromise = getJson<ApiResult<{ rows: ExpenseCategory[] }>>("categories").then((res) => {
      categoryCache = res;
      return res;
    }).finally(() => { categoryPromise = null; });
  }
  return categoryPromise;
};
export const addTransaction = (data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) => postJson<ApiResult<{ id?: string }>>({ action: "addTransaction", data });
export const updateTransaction = (id: string, data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) => postJson<ApiResult<Record<string, never>>>({ action: "updateTransaction", id, data });
export const deleteTransaction = (id: string) => postJson<ApiResult<Record<string, never>>>({ action: "deleteTransaction", id });

let employeeCache: ApiResult<{ rows: Employee[] }> | null = null;
let employeePromise: Promise<ApiResult<{ rows: Employee[] }>> | null = null;
export const getEmployees = async () => {
  if (employeeCache) return employeeCache;
  if (!employeePromise) {
    employeePromise = getJson<ApiResult<{ rows: Employee[] }>>("employees").then((res) => {
      employeeCache = res;
      return res;
    }).finally(() => { employeePromise = null; });
  }
  return employeePromise;
};
export const addEmployee = (name: string) => postJson<ApiResult<{ id?: string }>>({ action: "addEmployee", name });
export const deactivateEmployee = (id: string) => postJson<ApiResult<Record<string, never>>>({ action: "deactivateEmployee", id });
export const getLabor = (date: string) => getJson<ApiResult<{ rows: LaborEntry[]; summary: { totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] } }>>("labor", { date });
export const addLabor = (data: { date: string; employee: string; tableNo: string; tc: number; dailyPay: number; memo: string }) => postJson<ApiResult<{ id?: string }>>({ action: "addLabor", data });
export const deleteLabor = (id: string) => postJson<ApiResult<Record<string, never>>>({ action: "deleteLabor", id });

export const getReceivables = () => getJson<ApiResult<{ rows: Receivable[]; summary: ReceivableSummary }>>("receivables");
export const addReceivable = (data: { date: string; name: string; phone: string; amount: number; paid?: number; memo: string }) => postJson<ApiResult<{ id?: string }>>({ action: "addReceivable", data });
export const payReceivable = (id: string, paid: number, method: PaymentMethod, memo?: string) => postJson<ApiResult<Record<string, never>>>({ action: "payReceivable", id, paid, method, memo: memo || "" });
export const completeReceivable = (id: string, method: PaymentMethod, memo?: string) => postJson<ApiResult<Record<string, never>>>({ action: "completeReceivable", id, method, memo: memo || "" });
export const deleteReceivable = (id: string) => postJson<ApiResult<Record<string, never>>>({ action: "deleteReceivable", id });

export const getPersonalExpenses = (date: string) => getJson<ApiResult<{ rows: PersonalExpense[]; summary: PersonalExpenseSummary }>>("personal", { date });
export const addPersonalExpense = (data: { date: string; owner: "연주" | "관수"; method: PaymentMethod; amount: number; memo: string }) => postJson<ApiResult<{ id?: string }>>({ action: "addPersonalExpense", data });
export const deletePersonalExpense = (id: string) => postJson<ApiResult<Record<string, never>>>({ action: "deletePersonalExpense", id });
