import type { Dashboard, PaymentMethod, Transaction, TransactionType } from "./types";

// Apps Script 웹앱 배포 후 /exec URL을 여기에 붙여넣으세요.
export const API_URL: string = "";

type ApiResult<T> = {
  ok: boolean;
  error?: string;
} & T;

function hasApiUrl(): boolean {
  return API_URL.startsWith("https://script.google.com/");
}

async function getJson<T>(action: string, params?: Record<string, string>) {
  if (!hasApiUrl()) {
    throw new Error("API_URL_EMPTY");
  }

  const query = new URLSearchParams({
    action,
    ...(params || {}),
  });

  const res = await fetch(`${API_URL}?${query.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) throw new Error("API 요청 실패");
  return res.json() as Promise<T>;
}

async function postJson<T>(body: unknown) {
  if (!hasApiUrl()) {
    throw new Error("API_URL_EMPTY");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("API 요청 실패");
  return res.json() as Promise<T>;
}

export async function getDashboard(date: string) {
  return getJson<ApiResult<{ dashboard: Dashboard }>>("dashboard", { date });
}

export async function getTransactions(date: string) {
  return getJson<ApiResult<{ rows: Transaction[] }>>("transactions", { date });
}

export async function addTransaction(data: {
  date: string;
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  category: string;
  memo: string;
}) {
  return postJson<ApiResult<{ id?: string }>>({
    action: "addTransaction",
    data,
  });
}

export async function updateTransaction(
  id: string,
  data: {
    date: string;
    type: TransactionType;
    method: PaymentMethod;
    amount: number;
    category: string;
    memo: string;
  }
) {
  return postJson<ApiResult<Record<string, never>>>({
    action: "updateTransaction",
    id,
    data,
  });
}

export async function deleteTransaction(id: string) {
  return postJson<ApiResult<Record<string, never>>>({
    action: "deleteTransaction",
    id,
  });
}
