import { API_URL } from "./constants";
import type { Dashboard, ExpenseCategory, MonthlySummary, PaymentMethod, Transaction, TransactionType } from "./types";

type ApiResult<T> = { ok: boolean; error?: string } & T;

async function getJson<T>(action: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ action, ...(params || {}) });
  const res = await fetch(`${API_URL}?${query.toString()}`, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("API 요청 실패");
  return res.json() as Promise<T>;
}

async function postJson<T>(body: unknown) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("API 요청 실패");
  return res.json() as Promise<T>;
}

export function getDashboard(date: string) {
  return getJson<ApiResult<{ dashboard: Dashboard }>>("dashboard", { date });
}

export function getTransactions(date: string) {
  return getJson<ApiResult<{ rows: Transaction[] }>>("transactions", { date });
}

export function getMonthly(month: string) {
  return getJson<ApiResult<{ monthly: MonthlySummary; rows: Transaction[] }>>("monthly", { month });
}

export function getExpenseCategories() {
  return getJson<ApiResult<{ rows: ExpenseCategory[] }>>("categories");
}

export function addTransaction(data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) {
  return postJson<ApiResult<{ id?: string }>>({ action: "addTransaction", data });
}

export function updateTransaction(id: string, data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) {
  return postJson<ApiResult<Record<string, never>>>({ action: "updateTransaction", id, data });
}

export function deleteTransaction(id: string) {
  return postJson<ApiResult<Record<string, never>>>({ action: "deleteTransaction", id });
}
