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
type CacheEntry<T> = { time: number; value?: T; promise?: Promise<T> };
const CACHE_TTL = 1000 * 60 * 5;
const REQUEST_TIMEOUT_MS = 12000;
const apiCache = new Map<string, CacheEntry<unknown>>();

function hasApiUrl() { return API_URL.startsWith("https://script.google.com/"); }
function cacheKey(action: string, params?: Record<string, string>) { return `${action}:${new URLSearchParams(params || {}).toString()}`; }
function invalidateCache(match?: string | ((key: string) => boolean)) {
  if (!match) return apiCache.clear();
  for (const key of Array.from(apiCache.keys())) {
    if (typeof match === "string" ? key.startsWith(match) : match(key)) apiCache.delete(key);
  }
}
function rememberJson<T>(action: string, params: Record<string, string> | undefined, value: T) {
  apiCache.set(cacheKey(action, params), { time: Date.now(), value });
}
async function getJson<T>(action: string, params?: Record<string, string>, options?: { ttl?: number; force?: boolean }) {
  if (!hasApiUrl()) throw new Error("API_URL_EMPTY");
  const key = cacheKey(action, params);
  const ttl = options?.ttl ?? CACHE_TTL;
  const now = Date.now();
  const cached = apiCache.get(key) as CacheEntry<T> | undefined;
  if (!options?.force && cached) {
    if ("value" in cached && now - cached.time < ttl) return cached.value as T;
    if (cached.promise) return cached.promise;
  }
  const query = new URLSearchParams({ action, ...(params || {}) });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const promise = fetch(`${API_URL}?${query.toString()}`, { method: "GET", cache: "no-store", signal: controller.signal }).then((res) => {
    if (!res.ok) throw new Error("API 요청 실패");
    return res.json() as Promise<T>;
  }).then((value) => {
    apiCache.set(key, { time: Date.now(), value });
    return value;
  }).finally(() => {
    clearTimeout(timeout);
  }).catch((err) => {
    apiCache.delete(key);
    throw err;
  });
  apiCache.set(key, { time: now, promise });
  return promise;
}
async function postJson<T>(body: unknown) {
  if (!hasApiUrl()) throw new Error("API_URL_EMPTY");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), signal: controller.signal });
    if (!res.ok) throw new Error("API 요청 실패");
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export const clearApiCache = invalidateCache;
type InitResult = ApiResult<{
  date: string;
  startDate: string;
  endDate: string;
  home: ApiResult<{ dashboard: Dashboard; rows: Transaction[]; categories?: ExpenseCategory[] }>;
  labor: ApiResult<{ rows: LaborEntry[]; summary: { totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] } }>;
  personal: ApiResult<{ rows: PersonalExpense[]; summary: PersonalExpenseSummary }>;
  receivables: ApiResult<{ rows: Receivable[]; summary: ReceivableSummary }>;
  stats: ApiResult<{ stats: StatsSummary }>;
  employees: ApiResult<{ rows: Employee[] }>;
  categories: ApiResult<{ rows: ExpenseCategory[] }>;
}>;
export const getInit = async (date: string, options?: { force?: boolean }) => {
  const startDate = date.slice(0, 8) + "01";
  const endDate = date;
  const res = await getJson<InitResult>("init", { date, startDate, endDate }, options);
  if (res.ok) {
    rememberJson("home", { date }, res.home);
    rememberJson("labor", { date }, res.labor);
    rememberJson("personal", { date }, res.personal);
    rememberJson("receivables", undefined, res.receivables);
    rememberJson("stats", { startDate, endDate }, res.stats);
    rememberJson("categories", undefined, res.categories);
    rememberJson("employees", undefined, res.employees);
  }
  return res;
};
export const getHome = (date: string, options?: { force?: boolean }) => getJson<ApiResult<{ dashboard: Dashboard; rows: Transaction[]; categories?: ExpenseCategory[] }>>("home", { date }, options);
// The home screen only needs its own summary and transactions.  Keep adjacent
// days warm without paying for the full init payload (stats, labor, receivables,
// employees, and personal expenses).
export const preloadDay = (date: string) => { void getHome(date).catch(() => {}); };
export const getTransactions = (date: string, options?: { force?: boolean }) => getJson<ApiResult<{ rows: Transaction[] }>>("transactions", { date }, options);
export const getStats = (startDate: string, endDate: string, options?: { force?: boolean }) => getJson<ApiResult<{ stats: StatsSummary }>>("stats", { startDate, endDate }, options);
export const getMonthly = (month: string, options?: { force?: boolean }) => getJson<ApiResult<{ monthly: MonthlySummary; dailySales: DailySales[]; laborSummary: { totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] }; rows: Transaction[] }>>("monthly", { month }, options);
export const getExpenseCategories = (options?: { force?: boolean }) => getJson<ApiResult<{ rows: ExpenseCategory[] }>>("categories", undefined, options);

function invalidateDay(date?: string) {
  invalidateCache((key) => key.startsWith("home:") || key.startsWith("stats:") || key.startsWith("monthly:") || (date ? key === cacheKey("transactions", { date }) : key.startsWith("transactions:")));
}
function invalidateEmployees() { invalidateCache("employees:"); }
function invalidateReceivables() { invalidateCache("receivables:"); invalidateDay(); }
function invalidateLabor(date?: string) { invalidateCache(date ? cacheKey("labor", { date }) : "labor:"); invalidateDay(date); }
function invalidatePersonal(date?: string) { invalidateCache(date ? cacheKey("personal", { date }) : "personal:"); invalidateDay(date); }

export const addTransaction = async (data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) => { const res = await postJson<ApiResult<{ id?: string }>>({ action: "addTransaction", data }); invalidateDay(data.date); return res; };
export const updateTransaction = async (id: string, data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "updateTransaction", id, data }); invalidateDay(data.date); return res; };
export const deleteTransaction = async (id: string) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "deleteTransaction", id }); invalidateDay(); return res; };

export const getEmployees = (options?: { force?: boolean }) => getJson<ApiResult<{ rows: Employee[] }>>("employees", undefined, options);
export const addEmployee = async (name: string) => { const res = await postJson<ApiResult<{ id?: string }>>({ action: "addEmployee", name }); invalidateEmployees(); return res; };
export const deactivateEmployee = async (id: string) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "deactivateEmployee", id }); invalidateEmployees(); return res; };
export const getLabor = (date: string, options?: { force?: boolean }) => getJson<ApiResult<{ rows: LaborEntry[]; summary: { totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] } }>>("labor", { date }, options);
export const getLaborRange = (startDate: string, endDate: string, options?: { force?: boolean }) => getJson<ApiResult<{ rows: LaborEntry[]; summary: { totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] } }>>("labor", { startDate, endDate }, options);
export const addLabor = async (data: { date: string; employee: string; tableNo: string; tc: number; dailyPay: number; memo: string }) => { const res = await postJson<ApiResult<{ id?: string }>>({ action: "addLabor", data }); invalidateLabor(data.date); return res; };
export const updateLabor = async (id: string, data: { date: string; employee: string; tableNo: string; tc: number; dailyPay: number; memo: string }) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "updateLabor", id, data }); invalidateLabor(data.date); return res; };
export const deleteLabor = async (id: string) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "deleteLabor", id }); invalidateLabor(); return res; };

export const getReceivables = (options?: { force?: boolean }) => getJson<ApiResult<{ rows: Receivable[]; summary: ReceivableSummary }>>("receivables", undefined, options);
export const addReceivable = async (data: { date: string; name: string; phone: string; amount: number; paid?: number; memo: string }) => { const res = await postJson<ApiResult<{ id?: string }>>({ action: "addReceivable", data }); invalidateReceivables(); return res; };
export const updateReceivable = async (id: string, data: { date: string; name: string; phone: string; amount: number; paid: number; memo: string }) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "updateReceivable", id, data }); invalidateReceivables(); return res; };
export const payReceivable = async (id: string, paid: number, method: PaymentMethod, memo?: string) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "payReceivable", id, paid, method, memo: memo || "" }); invalidateReceivables(); return res; };
export const completeReceivable = async (id: string, method: PaymentMethod, memo?: string) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "completeReceivable", id, method, memo: memo || "" }); invalidateReceivables(); return res; };
export const deleteReceivable = async (id: string) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "deleteReceivable", id }); invalidateReceivables(); return res; };

export const getPersonalExpenses = (date: string, options?: { force?: boolean }) => getJson<ApiResult<{ rows: PersonalExpense[]; summary: PersonalExpenseSummary }>>("personal", { date }, options);
export const addPersonalExpense = async (data: { date: string; owner: "연주" | "관수"; method: PaymentMethod; amount: number; memo: string }) => { const res = await postJson<ApiResult<{ id?: string }>>({ action: "addPersonalExpense", data }); invalidatePersonal(data.date); return res; };
export const deletePersonalExpense = async (id: string) => { const res = await postJson<ApiResult<Record<string, never>>>({ action: "deletePersonalExpense", id }); invalidatePersonal(); return res; };
