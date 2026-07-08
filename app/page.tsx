"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, BarChart3, CalendarDays, ChevronLeft, ChevronRight, CreditCard, Filter, Home, Landmark, Pencil, Plus, Search, Settings, Trash2, UserRoundCheck, UsersRound, Wallet, X } from "lucide-react";
import { addEmployee, addLabor, addPersonalExpense, addReceivable, addTransaction, completeReceivable, deactivateEmployee, deleteLabor, deletePersonalExpense, deleteReceivable, deleteTransaction, getEmployees, getExpenseCategories, getHome, getInit, getLabor, getPersonalExpenses, getReceivables, getStats, payReceivable, preloadDay, updateLabor, updateReceivable, updateTransaction } from "@/lib/api";
import { addDays, money, todayString } from "@/lib/formatter";
import type { Dashboard, Employee, ExpenseCategory, LaborEntry, LaborSummaryByEmployee, PageKey, PaymentMethod, PersonalExpense, PersonalExpenseSummary, Receivable, ReceivableSummary, StatsSummary, Transaction, TransactionType } from "@/lib/types";

const APP_VERSION = "V4.2.2-STABLE";
const EMPTY_DASHBOARD: Dashboard = { date: todayString(), totalSales: 0, totalExpense: 0, profit: 0, cardSales: 0, cashSales: 0, bankSales: 0, cumulativeCash: 0, laborExpense: 0, receivableBalance: 0, receivableCount: 0, transactionCount: 0 };
const EMPTY_RCV: ReceivableSummary = { totalBalance: 0, count: 0, paidTotal: 0 };
const makeLocalId = () => `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
function syncPersonalSummary(rows: PersonalExpense[]): PersonalExpenseSummary {
  return rows.reduce((acc, r) => { const v = Number(r.amount || 0); acc.total += v; if (r.owner === "연주") acc.yeonju += v; if (r.owner === "관수") acc.gwansu += v; return acc; }, { total: 0, yeonju: 0, gwansu: 0 });
}
function syncLaborSummary(rows: LaborEntry[]) {
  const map: Record<string, LaborSummaryByEmployee> = {};
  let totalTc = 0, totalAmount = 0;
  rows.forEach((r) => { const tc = Number(r.tc || 0); const dailyPay = Number(r.dailyPay || 0); const amount = Number(r.amount || (tc + dailyPay)); totalTc += tc; totalAmount += amount; if (!map[r.employee]) map[r.employee] = { employee: r.employee, tc: 0, dailyPay: 0, amount: 0 }; map[r.employee].tc += tc; map[r.employee].dailyPay = Number(map[r.employee].dailyPay || 0) + dailyPay; map[r.employee].amount = Number(map[r.employee].amount || 0) + amount; });
  return { totalTc, totalAmount, byEmployee: Object.values(map) };
}
function normalizeReceivable(row: Receivable): Receivable {
  const paid = Number(row.paid || 0);
  const amount = Number(row.amount || 0);
  const balance = Math.max(0, amount - paid);
  const status = balance <= 0 ? "완납" : paid > 0 ? "일부입금" : "미수";
  return { ...row, amount, paid, balance, status };
}
function syncReceivableSummary(rows: Receivable[]): ReceivableSummary {
  return rows.reduce((acc, r) => { const row = normalizeReceivable(r); acc.totalBalance += row.balance; acc.paidTotal += Number(row.paid || 0); if (row.status !== "완납" && row.balance > 0) acc.count += 1; return acc; }, { totalBalance: 0, count: 0, paidTotal: 0 });
}
function applyReceivableRows(next: Receivable[], setRows: (rows: Receivable[]) => void, setSummary: (summary: ReceivableSummary) => void) {
  const normalized = next.map(normalizeReceivable);
  setRows(normalized);
  setSummary(syncReceivableSummary(normalized));
}
const OWNERS = ["연주", "관수"] as const;
const METHODS: PaymentMethod[] = ["카드", "현금", "계좌"];
const LABOR_TABLES = ["1T", "2T", "3T", "5T", "6T", "7T", "8T", "9T", "없음"];
const FALLBACK_CATEGORIES: ExpenseCategory[] = ["인건비", "마스터", "안주", "안주재료", "비품", "주류,음료", "공과금", "월세", "카드결제현금지급", "기타지출"].map((name, i) => ({ name, active: "Y", order: i + 1 }));

type TypeFilter = "전체" | TransactionType;
type MethodFilter = "전체" | "카드" | "현금" | "계좌";
type SortKey = "latest" | "oldest" | "high" | "low";
type TransactionFilters = { type: TypeFilter; method: MethodFilter; category: string; query: string; sort: SortKey };
const DEFAULT_FILTERS: TransactionFilters = { type: "전체", method: "전체", category: "전체", query: "", sort: "latest" };

function parseNum(value: string) { return Number(String(value || "").replace(/,/g, "")) || 0; }
function Header({ onSettings }: { onSettings: () => void }) { return <div className="flex items-center justify-between"><div className="w-12" /><h1 className="text-center text-2xl font-black tracking-wide">🎬 DRAMA LIVE</h1><button onClick={onSettings} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111A2E] text-slate-200 shadow-md active:scale-95"><Settings size={24} /></button></div>; }
function DateNavigator({ date, onChange }: { date: string; onChange: (date: string) => void }) { return <div className="mt-4 flex items-center gap-2"><button onClick={() => onChange(addDays(date, -1))} className="flex h-12 w-14 items-center justify-center rounded-2xl bg-[#111A2E]"><ChevronLeft size={22} /></button><label className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#111A2E] px-3 font-bold"><CalendarDays size={17} className="text-slate-300" /><input type="date" value={date} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-center text-white outline-none" /></label><button onClick={() => onChange(addDays(date, 1))} className="flex h-12 w-14 items-center justify-center rounded-2xl bg-[#111A2E]"><ChevronRight size={22} /></button></div>; }
function BottomNav({ page, onPage, onAdd }: { page: PageKey; onPage: (page: PageKey) => void; onAdd: () => void }) { const activeColor = (key: PageKey) => key === "labor" ? "text-pink-400" : "text-green-400"; const activeBar = (key: PageKey) => key === "labor" ? "bg-pink-400" : "bg-green-400"; const item = (key: PageKey, Icon: any, label: string) => <button onClick={() => onPage(key)} className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition ${page === key ? `-translate-y-1 ${activeColor(key)}` : "text-slate-400"}`}><Icon size={22} /><span className="text-[11px] font-bold">{label}</span>{page === key && <div className={`h-1 w-6 rounded-full ${activeBar(key)}`} />}</button>; return <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"><div className="relative h-24 w-full max-w-md border-t border-slate-800 bg-[#0B1220]/95 px-2 pt-2 backdrop-blur"><div className="flex h-full items-start justify-between gap-1">{item("home", Home, "홈")}{item("stats", BarChart3, "통계")}{item("personal", UsersRound, "개인지출")}<div className="w-16" />{item("labor", UserRoundCheck, "인건비")}{item("receivable", Banknote, "미수금")}</div><button onClick={onAdd} className="absolute -top-14 left-1/2 flex h-[70px] w-[70px] -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-2xl transition active:scale-95"><Plus size={38} /></button></div></div>; }

function DashboardView({ data, onFilter, onReceivable }: { data: Dashboard; onFilter: (filter: Partial<TransactionFilters>) => void; onReceivable: () => void }) {
  const box = (title: string, value: number, color: string, onClick?: () => void) => <button onClick={onClick} className="rounded-3xl bg-[#111A2E] p-4 text-left shadow-sm active:scale-[0.98]"><div className="text-sm text-slate-300">{title}</div><div className={`mt-1 font-black ${color}`}>₩ {money(value)}</div></button>;
  return <div className="mt-4 space-y-3"><button onClick={() => onFilter({ method: "현금" })} className="w-full rounded-3xl bg-green-500 p-5 text-left shadow-lg active:scale-[0.98]"><div className="text-sm font-bold opacity-90">누적금</div><div className="mt-1 text-3xl font-black">₩ {money(data.cumulativeCash || 0)}</div><div className="mt-1 text-xs opacity-80">전체 현금매출 - 전체 현금지출</div></button><div className="grid grid-cols-2 gap-3">{box("총매출", data.totalSales, "text-green-400", () => onFilter({ type: "매출" }))}{box("총지출", data.totalExpense, "text-red-400", () => onFilter({ type: "지출" }))}{box("오늘 순이익", data.profit, "text-blue-400")}{box("현재 미수금", data.receivableBalance || 0, "text-yellow-400", onReceivable)}</div><div className="grid grid-cols-3 gap-3">{box("카드", data.cardSales, "text-blue-400", () => onFilter({ method: "카드" }))}{box("현금", data.cashSales, "text-orange-400", () => onFilter({ method: "현금" }))}{box("계좌", data.bankSales, "text-purple-400", () => onFilter({ method: "계좌" }))}</div></div>;
}

function applyTransactionFilters(rows: Transaction[], filters: TransactionFilters) {
  const q = filters.query.trim().toLowerCase();
  const sorted = rows.filter((r) => {
    if (filters.type !== "전체" && r.type !== filters.type) return false;
    if (filters.method !== "전체" && r.method !== filters.method) return false;
    if (filters.category !== "전체" && r.category !== filters.category) return false;
    if (q) {
      const hay = [r.date, r.type, r.method, r.category, r.memo, String(r.amount)].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).slice();
  sorted.sort((a, b) => filters.sort === "oldest" ? a.date.localeCompare(b.date) : filters.sort === "high" ? b.amount - a.amount : filters.sort === "low" ? a.amount - b.amount : b.date.localeCompare(a.date));
  return sorted;
}
function filterTotal(rows: Transaction[]) { return rows.reduce((sum, r) => sum + Number(r.amount || 0), 0); }

function adjustDashboard(base: Dashboard, row: Transaction, sign: 1 | -1): Dashboard {
  const amount = Number(row.amount || 0) * sign;
  const next = { ...base };
  if (row.type === "매출") {
    next.totalSales += amount;
    if (row.method === "카드") next.cardSales += amount;
    if (row.method === "현금") { next.cashSales += amount; next.cumulativeCash += amount; }
    if (row.method === "계좌") next.bankSales += amount;
  }
  if (row.type === "지출") {
    const isLabor = row.category === "TC인건비" || row.method === "인건비";
    if (isLabor) next.laborExpense += amount;
    else next.totalExpense += amount;
    if (row.method === "카드") next.cardSales += amount;
    if (row.method === "현금") { next.cashSales += amount; next.cumulativeCash -= amount; }
    if (row.method === "계좌") next.bankSales += amount;
  }
  next.profit = next.totalSales - next.totalExpense;
  next.transactionCount = Math.max(0, (next.transactionCount || 0) + sign);
  return next;
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) { return <button onClick={onClear} className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-300">{label}<X size={13} /></button>; }
function TransactionFilterBar({ filters, categories, onChange, onReset, resultCount, resultTotal }: { filters: TransactionFilters; categories: ExpenseCategory[]; onChange: (next: Partial<TransactionFilters>) => void; onReset: () => void; resultCount: number; resultTotal: number }) {
  const has = filters.type !== "전체" || filters.method !== "전체" || filters.category !== "전체" || !!filters.query.trim() || filters.sort !== "latest";
  return <div className="mt-4 rounded-3xl bg-[#111A2E] p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 font-black"><Filter size={18} />거래 필터</div><button onClick={onReset} className="rounded-xl bg-slate-800 px-3 py-1 text-xs text-slate-300">초기화</button></div><div className="grid grid-cols-3 gap-2">{(["전체", "매출", "지출"] as TypeFilter[]).map((v) => <button key={v} onClick={() => onChange({ type: v })} className={`h-10 rounded-2xl text-sm font-bold ${filters.type === v ? "bg-green-500 text-white" : "bg-slate-800 text-slate-300"}`}>{v}</button>)}</div><div className="mt-2 grid grid-cols-4 gap-2">{(["전체", "카드", "현금", "계좌"] as MethodFilter[]).map((v) => <button key={v} onClick={() => onChange({ method: v })} className={`h-10 rounded-2xl text-sm font-bold ${filters.method === v ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"}`}>{v}</button>)}</div>{filters.type === "지출" && <select value={filters.category} onChange={(e) => onChange({ category: e.target.value })} className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"><option value="전체">지출항목 전체</option>{categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>}<div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-800 px-4"><Search size={18} className="text-slate-400" /><input value={filters.query} onChange={(e) => onChange({ query: e.target.value })} placeholder="메모 / 항목 / 금액 검색" className="h-12 flex-1 bg-transparent text-white outline-none" /></div><select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as SortKey })} className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"><option value="latest">최신순</option><option value="oldest">오래된순</option><option value="high">금액 높은순</option><option value="low">금액 낮은순</option></select>{has && <div className="mt-3 flex flex-wrap gap-2">{filters.type !== "전체" && <FilterChip label={filters.type} onClear={() => onChange({ type: "전체" })} />}{filters.method !== "전체" && <FilterChip label={filters.method} onClear={() => onChange({ method: "전체" })} />}{filters.category !== "전체" && <FilterChip label={filters.category} onClear={() => onChange({ category: "전체" })} />}{filters.query.trim() && <FilterChip label={filters.query.trim()} onClear={() => onChange({ query: "" })} />}{filters.sort !== "latest" && <FilterChip label={filters.sort === "oldest" ? "오래된순" : filters.sort === "high" ? "금액 높은순" : "금액 낮은순"} onClear={() => onChange({ sort: "latest" })} />}</div>}<div className="mt-3 rounded-2xl bg-slate-900/70 p-3 text-sm text-slate-300">총 {resultCount}건 · 합계 <span className="font-black text-white">₩ {money(resultTotal)}</span></div></div>;
}
function TransactionList({ items, onDelete, onEdit, allowActions = true }: { items: Transaction[]; onDelete: (id: string) => void; onEdit: (item: Transaction) => void; allowActions?: boolean }) {
  if (!items.length) return <div className="mt-4 rounded-3xl bg-[#111A2E] p-8 text-center text-sm text-slate-400">거래내역이 없습니다.</div>;
  return <div className="mt-4 space-y-3">{items.map((item) => { const Icon = item.method === "카드" ? CreditCard : item.method === "현금" ? Wallet : item.method === "계좌" ? Landmark : UserRoundCheck; const color = item.type === "매출" ? "border-green-500/50" : "border-red-500/50"; return <div key={item.id} className={`rounded-3xl border-l-4 ${color} bg-[#111A2E] p-4`}><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2 font-bold"><Icon size={18} />{item.method}<span className={`rounded-full px-2 py-0.5 text-xs ${item.type === "매출" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>{item.type}</span></div>{item.memo && <div className="mt-2 text-sm text-slate-300">📝 {item.memo}</div>}{item.category && <div className="mt-1 text-sm text-slate-400">📂 {item.category}</div>}<div className="mt-1 text-xs text-slate-500">{item.date}</div></div><div className="text-right"><div className={`text-lg font-black ${item.type === "매출" ? "text-green-300" : "text-red-300"}`}>₩ {money(item.amount)}</div>{allowActions && <div className="mt-2 flex justify-end gap-3"><button onClick={() => onEdit(item)} className="inline-flex items-center gap-1 text-xs text-blue-400"><Pencil size={14} />수정</button><button onClick={() => onDelete(item.id)} className="inline-flex items-center gap-1 text-xs text-red-400"><Trash2 size={14} />삭제</button></div>}</div></div></div>; })}</div>;
}

function InputSheet({ open, date, editItem, onClose, onSave, onUpdate }: { open: boolean; date: string; editItem?: Transaction | null; onClose: () => void; onSave: (data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) => Promise<void>; onUpdate: (id: string, data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) => Promise<void> }) {
  const [type, setType] = useState<TransactionType>("매출"); const [method, setMethod] = useState<PaymentMethod>("카드"); const [amount, setAmount] = useState(""); const [memo, setMemo] = useState(""); const [category, setCategory] = useState(""); const [categories, setCategories] = useState<ExpenseCategory[]>(FALLBACK_CATEGORIES); const [saving, setSaving] = useState(false); const amountRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!open) return; getExpenseCategories().then((res) => { const rows = res.rows?.length ? res.rows : FALLBACK_CATEGORIES; setCategories(rows); setCategory((c) => c || rows[0].name); }).catch(() => { setCategories(FALLBACK_CATEGORIES); setCategory(FALLBACK_CATEGORIES[0].name); }); setTimeout(() => amountRef.current?.focus(), 100); }, [open]);
  useEffect(() => { if (!open) return; if (editItem) { setType(editItem.type); setMethod(editItem.method === "인건비" ? "카드" : editItem.method); setAmount(String(editItem.amount || "")); setMemo(editItem.memo || ""); setCategory(editItem.category || FALLBACK_CATEGORIES[0].name); } else { setType("매출"); setMethod("카드"); setAmount(""); setMemo(""); setCategory(categories[0]?.name || FALLBACK_CATEGORIES[0].name); } }, [open, editItem]);
  if (!open) return null;
  const save = async () => { const value = parseNum(amount); if (!value) return alert("금액을 입력해주세요."); const payload = { date: editItem?.date || date, type, method, amount: value, category: type === "지출" ? category : "", memo }; try { setSaving(true); if (editItem) await onUpdate(editItem.id, payload); else await onSave(payload); onClose(); } finally { setSaving(false); } };
  return <><div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} /><div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"><div className="w-full max-w-md rounded-t-[28px] bg-[#111827] p-5 shadow-2xl"><div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-slate-600" /><div className="mb-4 text-lg font-black">{editItem ? "거래 수정" : "빠른 입력"}</div><div className="grid grid-cols-2 gap-2">{(["매출", "지출"] as TransactionType[]).map((v) => <button key={v} onClick={() => setType(v)} className={`h-12 rounded-2xl font-bold ${type === v ? "bg-green-500 text-white" : "bg-slate-800 text-slate-300"}`}>{v}</button>)}</div><div className="mt-3 grid grid-cols-3 gap-2">{METHODS.map((v) => <button key={v} onClick={() => setMethod(v)} className={`h-12 rounded-2xl font-bold ${method === v ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"}`}>{v}</button>)}</div>{type === "지출" && <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none">{categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>}<input ref={amountRef} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="금액" className="mt-3 h-14 w-full rounded-2xl bg-slate-800 px-4 text-xl font-black text-white outline-none" /><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" /><button disabled={saving} onClick={save} className="mt-4 h-14 w-full rounded-2xl bg-green-500 text-lg font-black disabled:opacity-50">{saving ? "저장 중..." : editItem ? "수정 저장" : "저장"}</button></div></div></>;
}

function PersonalExpenseList({ items, onDelete }: { items: PersonalExpense[]; onDelete?: (id: string) => void }) { if (!items.length) return <div className="mt-4 rounded-3xl bg-[#111A2E] p-8 text-center text-sm text-slate-400">개인지출 내역이 없습니다.</div>; return <div className="mt-4 space-y-3">{items.map((item) => <div key={item.id} className="rounded-3xl border-l-4 border-blue-500/50 bg-[#111A2E] p-4"><div className="flex justify-between gap-4"><div><div className="font-black">{item.owner} · {item.method}</div>{item.memo && <div className="mt-2 text-sm text-slate-300">📝 {item.memo}</div>}<div className="mt-1 text-xs text-slate-500">{item.date}</div></div><div className="text-right"><div className="font-black text-blue-300">₩ {money(item.amount)}</div>{onDelete && <button onClick={() => onDelete(item.id)} className="mt-2 text-xs text-red-400">삭제</button>}</div></div></div>)}</div>; }
function PersonalPage({ date, onChanged }: { date: string; onChanged: () => Promise<void> }) { const [rows, setRows] = useState<PersonalExpense[]>([]); const [summary, setSummary] = useState<PersonalExpenseSummary>({ total: 0, yeonju: 0, gwansu: 0 }); const [owner, setOwner] = useState<"연주" | "관수">("연주"); const [method, setMethod] = useState<PaymentMethod>("카드"); const [amount, setAmount] = useState(""); const [memo, setMemo] = useState(""); const [ownerFilter, setOwnerFilter] = useState<"전체" | "연주" | "관수">("전체"); const load = async () => { const res = await getPersonalExpenses(date); if (res.ok) { setRows(res.rows || []); setSummary(res.summary); } }; useEffect(() => { load().catch(() => {}); }, [date]); const applyRows = (next: PersonalExpense[]) => { setRows(next); setSummary(syncPersonalSummary(next)); }; const save = async () => { const value = parseNum(amount); if (!value) return alert("금액을 입력해주세요."); const previous = rows; const row: PersonalExpense = { id: makeLocalId(), date, owner, method, amount: value, memo }; applyRows([row, ...rows]); setAmount(""); setMemo(""); void addPersonalExpense({ date, owner, method, amount: value, memo }).then(async () => { await load(); await onChanged(); }).catch(() => { applyRows(previous); alert("저장에 실패했습니다. 다시 시도해주세요."); }); }; const remove = async (id: string) => { if (!confirm("개인지출을 삭제할까요?")) return; const previous = rows; applyRows(rows.filter((r) => r.id !== id)); void deletePersonalExpense(id).then(async () => { await load(); await onChanged(); }).catch(() => { applyRows(previous); alert("삭제에 실패했습니다. 다시 시도해주세요."); }); }; const shown = ownerFilter === "전체" ? rows : rows.filter((r) => r.owner === ownerFilter); return <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><button onClick={() => setOwnerFilter("연주")} className="rounded-3xl bg-[#111A2E] p-4 text-left"><div className="text-sm text-slate-300">연주</div><div className="mt-1 text-xl font-black text-green-400">₩ {money(summary.yeonju)}</div></button><button onClick={() => setOwnerFilter("관수")} className="rounded-3xl bg-[#111A2E] p-4 text-left"><div className="text-sm text-slate-300">관수</div><div className="mt-1 text-xl font-black text-green-400">₩ {money(summary.gwansu)}</div></button></div><div className="rounded-3xl bg-[#111A2E] p-4"><div className="mb-3 text-lg font-black">개인지출 입력</div><div className="grid grid-cols-2 gap-2">{OWNERS.map((v) => <button key={v} onClick={() => setOwner(v)} className={`h-12 rounded-2xl font-bold ${owner === v ? "bg-green-500" : "bg-slate-800 text-slate-300"}`}>{v}</button>)}</div><div className="mt-3 grid grid-cols-3 gap-2">{METHODS.map((v) => <button key={v} onClick={() => setMethod(v)} className={`h-12 rounded-2xl font-bold ${method === v ? "bg-blue-500" : "bg-slate-800 text-slate-300"}`}>{v}</button>)}</div><input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="금액" className="mt-3 h-14 w-full rounded-2xl bg-slate-800 px-4 text-xl font-black text-white outline-none" /><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" /><button onClick={save} className="mt-4 h-14 w-full rounded-2xl bg-green-500 text-lg font-black">저장</button></div>{ownerFilter !== "전체" && <button onClick={() => setOwnerFilter("전체")} className="rounded-2xl bg-slate-800 px-3 py-2 text-sm">전체 보기</button>}<PersonalExpenseList items={shown} onDelete={remove} /></div>; }

function StatsPage() { const [startDate, setStartDate] = useState(todayString().slice(0, 8) + "01"); const [endDate, setEndDate] = useState(todayString()); const [stats, setStats] = useState<StatsSummary | null>(null); const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS); const [categories, setCategories] = useState<ExpenseCategory[]>(FALLBACK_CATEGORIES); const [personalMode, setPersonalMode] = useState<"none" | "all" | "연주" | "관수">("none"); const load = async () => { const [res, cats] = await Promise.all([getStats(startDate, endDate), getExpenseCategories().catch(() => ({ rows: FALLBACK_CATEGORIES }))]); if (res.ok) setStats(res.stats); setCategories(cats.rows?.length ? cats.rows : FALLBACK_CATEGORIES); }; useEffect(() => { load().catch(() => {}); setFilters(DEFAULT_FILTERS); setPersonalMode("none"); }, [startDate, endDate]); const s = stats; const rows = s?.rows || []; const filtered = useMemo(() => applyTransactionFilters(rows, filters), [rows, filters]); const personalRows = s?.personalRows || []; const shownPersonal = personalMode === "연주" ? personalRows.filter((r) => r.owner === "연주") : personalMode === "관수" ? personalRows.filter((r) => r.owner === "관수") : personalMode === "all" ? personalRows : []; const top3 = useMemo(() => { const map: Record<string, number> = {}; rows.filter((r) => r.type === "지출" && r.category).forEach((r) => { map[r.category] = (map[r.category] || 0) + Number(r.amount || 0); }); return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3); }, [rows]); const card = (title: string, value: number, color: string, onClick?: () => void) => <button onClick={onClick} className="rounded-3xl bg-[#111A2E] p-4 text-left shadow-sm active:scale-[0.98]"><div className="text-sm text-slate-300">{title}</div><div className={`mt-1 font-black ${color}`}>₩ {money(value)}</div></button>; const setF = (next: Partial<TransactionFilters>) => { setPersonalMode("none"); setFilters((f) => ({ ...f, ...next })); }; return <div className="space-y-4"><div className="rounded-3xl bg-[#111A2E] p-4"><div className="mb-3 text-lg font-black">통계 기간</div><div className="grid grid-cols-2 gap-2"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 rounded-2xl bg-slate-800 px-3 text-white outline-none" /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 rounded-2xl bg-slate-800 px-3 text-white outline-none" /></div></div>{s && <><button onClick={() => setF({ method: "현금" })} className="w-full rounded-3xl bg-green-500 p-5 text-left shadow-lg active:scale-[0.98]"><div className="text-sm font-bold opacity-90">누적금</div><div className="mt-1 text-3xl font-black">₩ {money(s.cumulativeCash || 0)}</div><div className="mt-1 text-xs opacity-80">선택 기간 현금매출 - 현금지출</div></button><div className="grid grid-cols-2 gap-3">{card("총매출", s.totalSales, "text-green-400", () => setF({ type: "매출" }))}{card("총지출", s.totalExpense, "text-red-400", () => setF({ type: "지출" }))}{card("순이익", s.profit, "text-blue-400")}{card("개인지출", s.personal.total, "text-blue-400", () => setPersonalMode("all"))}</div><div className="grid grid-cols-3 gap-3">{card("카드", s.cardSales, "text-blue-400", () => setF({ method: "카드" }))}{card("현금", s.cashSales, "text-orange-400", () => setF({ method: "현금" }))}{card("계좌", s.bankSales, "text-purple-400", () => setF({ method: "계좌" }))}</div><div className="rounded-3xl bg-[#111A2E] p-4"><div className="font-black">개인지출</div><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><button onClick={() => setPersonalMode("연주")} className="rounded-2xl bg-slate-800 p-3 text-left">연주<br /><b className="text-green-400">₩ {money(s.personal.yeonju)}</b></button><button onClick={() => setPersonalMode("관수")} className="rounded-2xl bg-slate-800 p-3 text-left">관수<br /><b className="text-green-400">₩ {money(s.personal.gwansu)}</b></button><button onClick={() => setPersonalMode("all")} className="rounded-2xl bg-slate-800 p-3 text-left">합계<br /><b className="text-green-400">₩ {money(s.personal.total)}</b></button></div></div><div className="rounded-3xl bg-[#111A2E] p-4"><div className="font-black">TOP3 지출항목</div>{!top3.length && <div className="mt-2 text-sm text-slate-400">지출항목 데이터가 없습니다.</div>}{top3.map(([name, value], idx) => <div key={name} className="mt-2 flex justify-between rounded-2xl bg-slate-800 p-3 text-sm"><span>{idx + 1}. {name}</span><b>₩ {money(value)}</b></div>)}</div>{personalMode === "none" && <><TransactionFilterBar filters={filters} categories={categories} onChange={setF} onReset={() => setFilters(DEFAULT_FILTERS)} resultCount={filtered.length} resultTotal={filterTotal(filtered)} /><div className="mt-5 text-lg font-black">🧾 통계 거래내역</div><TransactionList items={filtered} onDelete={() => {}} onEdit={() => {}} allowActions={false} /></>}{personalMode !== "none" && <><button onClick={() => setPersonalMode("none")} className="rounded-2xl bg-slate-800 px-3 py-2 text-sm">거래내역으로 돌아가기</button><div className="mt-5 text-lg font-black">🔵 {personalMode === "all" ? "개인지출 전체" : `${personalMode} 개인지출`}</div><PersonalExpenseList items={shownPersonal} /></>}</>}</div>; }

function LaborPage({ date, onChanged }: { date: string; onChanged: () => Promise<void> }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<LaborEntry[]>([]);
  const [summary, setSummary] = useState<{ totalTc: number; totalAmount: number; byEmployee: LaborSummaryByEmployee[] }>({ totalTc: 0, totalAmount: 0, byEmployee: [] });
  const [employee, setEmployee] = useState("");
  const [tableNo, setTableNo] = useState("없음");
  const [tc, setTc] = useState("");
  const [dailyPay, setDailyPay] = useState("");
  const [memo, setMemo] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    const [empRes, laborRes] = await Promise.all([getEmployees(), getLabor(date)]);
    if (empRes.ok) {
      setEmployees(empRes.rows || []);
      setEmployee((e) => e || empRes.rows?.[0]?.name || "");
    }
    if (laborRes.ok) {
      const normalized = (laborRes.rows || []).map((r) => ({ ...r, amount: (r.tc || 0) + (r.dailyPay || 0) }));
      setRows(normalized);
      setSummary(syncLaborSummary(normalized));
    }
  };

  useEffect(() => { load().catch(() => {}); }, [date]);

  const applyRows = (next: LaborEntry[]) => {
    const normalized = next.map((r) => ({ ...r, amount: (r.tc || 0) + (r.dailyPay || 0) }));
    setRows(normalized);
    setSummary(syncLaborSummary(normalized));
  };

  const resetForm = () => {
    setTc("");
    setDailyPay("");
    setMemo("");
    setTableNo("없음");
    setEditId(null);
  };

  const save = async () => {
    if (!employee) return alert("직원을 선택해주세요.");
    const tcValue = parseNum(tc);
    const dailyValue = parseNum(dailyPay);
    const cleanTable = tableNo === "없음" ? "" : tableNo.replace("T", "");
    const previous = rows;

    if (editId) {
      const next = rows.map((r) => r.id === editId ? { ...r, date, employee, tableNo: cleanTable, tc: tcValue, dailyPay: dailyValue, amount: tcValue + dailyValue, memo } : r);
      applyRows(next);
      const targetId = editId;
      resetForm();
      void updateLabor(targetId, { date, employee, tableNo: cleanTable, tc: tcValue, dailyPay: dailyValue, memo }).then(() => {
        void onChanged().catch(() => {});
      }).catch(() => {
        applyRows(previous);
        alert("수정에 실패했습니다. 다시 시도해주세요.");
      });
      return;
    }

    const row: LaborEntry = { id: makeLocalId(), transactionId: "", date, employee, tableNo: cleanTable, tc: tcValue, dailyPay: dailyValue, amount: tcValue + dailyValue, memo };
    applyRows([row, ...rows]);
    resetForm();
    void addLabor({ date, employee, tableNo: cleanTable, tc: tcValue, dailyPay: dailyValue, memo }).then((res: any) => {
      if (res?.id) setRows((current) => current.map((r) => r.id === row.id ? { ...r, id: res.id } : r));
      void onChanged().catch(() => {});
    }).catch(() => {
      applyRows(previous);
      alert("저장에 실패했습니다. 다시 시도해주세요.");
    });
  };

  const startEdit = (item: LaborEntry) => {
    setEditId(item.id);
    setEmployee(item.employee);
    setTableNo(item.tableNo ? `${item.tableNo}T` : "없음");
    setTc(String(item.tc || ""));
    setDailyPay(String(item.dailyPay || ""));
    setMemo(item.memo || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: string) => {
    if (!confirm("인건비 내역을 삭제할까요?")) return;
    const previous = rows;
    applyRows(rows.filter((r) => r.id !== id));
    if (editId === id) resetForm();
    void deleteLabor(id).then(() => {
      void onChanged().catch(() => {});
    }).catch(() => {
      applyRows(previous);
      alert("삭제에 실패했습니다. 다시 시도해주세요.");
    });
  };

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return rows.filter((r) => {
      const byEmployee = filterEmployee === "전체" || r.employee === filterEmployee;
      const hay = `${r.employee} ${r.tableNo ? `${r.tableNo}T` : "테이블 없음"} ${r.memo || ""}`.toLowerCase();
      return byEmployee && (!q || hay.includes(q));
    });
  }, [rows, filterEmployee, keyword]);

  const visibleSummary = useMemo(() => syncLaborSummary(filteredRows), [filteredRows]);

  return <div className="space-y-4">
    <div className="rounded-3xl bg-pink-500 p-5"><div className="text-sm font-bold opacity-90">지급금액</div><div className="mt-1 text-3xl font-black">₩ {money(summary.totalAmount || 0)}</div><div className="mt-1 text-sm">TC + 일비 합산</div></div>
    <div className="grid grid-cols-2 gap-3">{summary.byEmployee.map((r) => <div key={r.employee} className="rounded-3xl bg-[#111A2E] p-4"><div className="text-sm text-slate-300">{r.employee} 지급금액</div><div className="mt-1 font-black text-pink-400">₩ {money(r.amount || 0)}</div></div>)}</div>
    <div className="rounded-3xl bg-[#111A2E] p-4"><div className="mb-3 text-lg font-black">{editId ? "인건비 수정" : "인건비 입력"}</div><select value={employee} onChange={(e) => setEmployee(e.target.value)} className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none">{employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}</select><select value={tableNo} onChange={(e) => setTableNo(e.target.value)} className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none">{LABOR_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}</select><input inputMode="numeric" value={tc} onChange={(e) => setTc(e.target.value.replace(/[^0-9]/g, ""))} placeholder="TC" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" /><input inputMode="numeric" value={dailyPay} onChange={(e) => setDailyPay(e.target.value.replace(/[^0-9]/g, ""))} placeholder="일비" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" /><input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" /><div className="mt-4 flex gap-2"><button onClick={save} className="h-14 flex-1 rounded-2xl bg-pink-500 text-lg font-black">{editId ? "수정 저장" : "저장"}</button>{editId && <button onClick={resetForm} className="h-14 rounded-2xl bg-slate-700 px-4 font-black">취소</button>}</div></div>
    <div className="rounded-3xl bg-[#111A2E] p-4"><div className="mb-3 flex items-center gap-2 text-lg font-black"><Search size={18} /> 인건비 내역 검색</div><div className="grid grid-cols-2 gap-2"><select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="h-12 rounded-2xl bg-slate-800 px-3 text-white outline-none"><option value="전체">전체 직원</option>{employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}</select><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="이름/테이블/메모" className="h-12 rounded-2xl bg-slate-800 px-3 text-white outline-none" /></div><div className="mt-3 text-sm text-slate-400">검색결과 {filteredRows.length}건 · 지급 ₩ {money(visibleSummary.totalAmount || 0)}</div></div>
    <div className="space-y-3">{filteredRows.map((item) => <div key={item.id} className="rounded-3xl border-l-4 border-pink-500/50 bg-[#111A2E] p-4"><div className="flex justify-between gap-3"><div><div className="font-black">{item.employee}</div><div className="mt-1 text-sm text-slate-400">{item.tableNo ? `${item.tableNo}T` : "테이블 없음"} · TC ₩ {money(item.tc || 0)} · 일비 ₩ {money(item.dailyPay || 0)}</div>{item.memo && <div className="mt-1 text-sm text-slate-300">📝 {item.memo}</div>}</div><div className="text-right"><div className="text-sm text-slate-400">지급금액</div><div className="font-black text-pink-400">₩ {money((item.tc || 0) + (item.dailyPay || 0))}</div><div className="mt-2 flex justify-end gap-3"><button onClick={() => startEdit(item)} className="text-xs text-pink-300">수정</button><button onClick={() => remove(item.id)} className="text-xs text-red-400">삭제</button></div></div></div></div>)}</div>
  </div>;
}

function ReceivablePage({ onChanged, focusDate }: { onChanged: () => Promise<void>; focusDate?: string }) {
  const [rows, setRows] = useState<Receivable[]>([]);
  const [summary, setSummary] = useState<ReceivableSummary>(EMPTY_RCV);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(todayString());
  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
  const [payMethod, setPayMethod] = useState<Record<string, PaymentMethod>>({});

  const load = async () => {
    const res = await getReceivables();
    if (res.ok) applyReceivableRows(res.rows || [], setRows, setSummary);
  };

  useEffect(() => { load().catch(() => {}); }, []);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setAmount("");
    setPaid("");
    setMemo("");
    setDate(todayString());
  };

  const save = async () => {
    const value = parseNum(amount);
    const paidValue = editing ? editing.paid : parseNum(paid);
    if (!name.trim()) return alert("손님명을 입력해주세요.");
    if (!value) return alert("발생금액을 입력해주세요.");
    const payload = { date: date || todayString(), name: name.trim(), phone, amount: value, paid: paidValue || 0, memo };
    const previous = rows;
    const nextRow = normalizeReceivable({ ...(editing || { id: makeLocalId(), payments: [] }), ...payload, balance: Math.max(0, value - (paidValue || 0)), status: "미수" as const });
    applyReceivableRows(editing ? rows.map((r) => r.id === editing.id ? nextRow : r) : [nextRow, ...rows], setRows, setSummary);
    resetForm();
    const job = editing ? updateReceivable(editing.id, payload) : addReceivable(payload);
    void job.then((res: any) => {
      if (!editing && res?.id) setRows((current) => current.map((r) => r.id === nextRow.id ? { ...r, id: res.id } : r));
      void onChanged().catch(() => {});
    }).catch(() => { applyReceivableRows(previous, setRows, setSummary); alert("저장에 실패했습니다. 다시 시도해주세요."); });
  };

  const edit = (item: Receivable) => {
    setEditing(item);
    setDate(item.date || todayString());
    setName(item.name || "");
    setPhone(item.phone || "");
    setAmount(String(item.amount || ""));
    setPaid(String(item.paid || ""));
    setMemo(item.memo || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pay = async (id: string) => {
    const value = parseNum(payAmount[id] || "");
    if (!value) return alert("입금액을 입력해주세요.");
    const method = payMethod[id] || "현금";
    const previous = rows;
    const target = rows.find((r) => r.id === id);
    if (target) {
      const nextPaid = Number(target.paid || 0) + value;
      const nextBalance = Math.max(0, Number(target.amount || 0) - nextPaid);
      const payment = { id: makeLocalId(), date: todayString(), receivableId: id, name: target.name, status: nextBalance <= 0 ? "완납" : "일부입금", method, amount: value, balance: nextBalance, memo: "" };
      applyReceivableRows(rows.map((r) => r.id === id ? normalizeReceivable({ ...r, paid: nextPaid, payments: [...(r.payments || []), payment] }) : r), setRows, setSummary);
    }
    setPayAmount((p) => ({ ...p, [id]: "" }));
    void payReceivable(id, value, method).then(() => { void onChanged().catch(() => {}); }).catch(() => { applyReceivableRows(previous, setRows, setSummary); alert("입금 처리에 실패했습니다. 다시 시도해주세요."); });
  };

  const complete = async (id: string) => {
    if (!confirm("완납 처리할까요?")) return;
    const method = payMethod[id] || "현금";
    const previous = rows;
    const target = rows.find((r) => r.id === id);
    if (target) {
      const remain = Math.max(0, Number(target.balance || 0));
      const payment = { id: makeLocalId(), date: todayString(), receivableId: id, name: target.name, status: "완납", method, amount: remain, balance: 0, memo: "" };
      applyReceivableRows(rows.map((r) => r.id === id ? normalizeReceivable({ ...r, paid: Number(r.amount || 0), payments: remain > 0 ? [...(r.payments || []), payment] : (r.payments || []) }) : r), setRows, setSummary);
    }
    void completeReceivable(id, method).then(() => { void onChanged().catch(() => {}); }).catch(() => { applyReceivableRows(previous, setRows, setSummary); alert("완납 처리에 실패했습니다. 다시 시도해주세요."); });
  };

  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    const previous = rows;
    applyReceivableRows(rows.filter((r) => r.id !== id), setRows, setSummary);
    void deleteReceivable(id).then(() => { void onChanged().catch(() => {}); }).catch(() => { applyReceivableRows(previous, setRows, setSummary); alert("삭제에 실패했습니다. 다시 시도해주세요."); });
  };

  const shown = focusDate ? rows.filter((r) => r.date === focusDate) : rows;

  return <div className="space-y-4">
    <div className="rounded-3xl bg-yellow-500 p-5">
      <div className="text-sm font-bold opacity-90">현재 미수금</div>
      <div className="mt-1 text-3xl font-black">₩ {money(summary.totalBalance)}</div>
      <div className="mt-1 text-sm">{summary.count}건 / 회수 ₩ {money(summary.paidTotal)}</div>
    </div>

    <div className="rounded-3xl bg-[#111A2E] p-4">
      <div className="mb-3 text-lg font-black">{editing ? "미수금 수정" : "미수금 등록"}</div>
      <div className="space-y-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="손님명" className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호(선택)" className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="발생금액" className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        {!editing && <input inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value.replace(/[^0-9]/g, ""))} placeholder="입금금액(있으면)" className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />}
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={save} className="h-14 flex-1 rounded-2xl bg-yellow-500 text-lg font-black">{editing ? "수정 저장" : "미수금 저장"}</button>
        {editing && <button onClick={resetForm} className="h-14 rounded-2xl bg-slate-700 px-4 font-black">취소</button>}
      </div>
    </div>

    <div className="space-y-3">{shown.map((item) => <div key={item.id} className="rounded-3xl border-l-4 border-yellow-500/50 bg-[#111A2E] p-4">
      <div className="flex justify-between gap-4">
        <div className="min-w-0">
          <div className="font-black">{item.name}</div>
          {item.phone && <div className="mt-1 text-sm text-slate-400">{item.phone}</div>}
          {item.memo && <div className="mt-1 text-sm text-slate-300">📝 {item.memo}</div>}
          <div className="mt-1 text-xs text-slate-500">{item.date}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm text-slate-400">잔액</div>
          <div className={`font-black ${item.status === "완납" ? "text-green-400" : "text-yellow-300"}`}>₩ {money(item.balance)}</div>
          <div className="mt-1 text-xs text-slate-400">{item.status}</div>
        </div>
      </div>

      {!!item.payments?.length && <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 text-xs">
        <div className="mb-2 font-bold text-slate-300">입금내역</div>
        <div className="space-y-1.5">{item.payments.map((p) => <div key={p.id} className="flex justify-between gap-2 text-slate-300">
          <div><span className="text-slate-500">{p.date}</span><span className="ml-2 rounded-full bg-yellow-500/15 px-2 py-0.5 text-yellow-300">{p.status}</span><span className="ml-2 text-blue-300">{p.method}</span>{p.memo && <span className="ml-2 text-slate-400">{p.memo}</span>}</div>
          <div className="text-right"><div className="font-black text-green-300">₩ {money(p.amount)}</div><div className="text-[11px] text-slate-500">잔액 ₩ {money(p.balance)}</div></div>
        </div>)}</div>
      </div>}

      {item.status !== "완납" && <div className="mt-3 flex flex-wrap items-center gap-2">
        <input inputMode="numeric" value={payAmount[item.id] || ""} onChange={(e) => setPayAmount((p) => ({ ...p, [item.id]: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="입금액" className="h-11 min-w-[120px] flex-1 rounded-2xl bg-slate-800 px-3 text-white outline-none" />
        <select value={payMethod[item.id] || "현금"} onChange={(e) => setPayMethod((p) => ({ ...p, [item.id]: e.target.value as PaymentMethod }))} className="h-11 w-[72px] rounded-2xl bg-slate-800 px-2 text-xs text-white outline-none"><option value="현금">현금</option><option value="카드">카드</option><option value="계좌">계좌</option></select>
        <button onClick={() => pay(item.id)} className="h-11 min-w-[52px] rounded-2xl bg-blue-500 px-3 text-sm font-black">입금</button>
        <button onClick={() => complete(item.id)} className="h-11 min-w-[52px] rounded-2xl bg-green-500 px-3 text-sm font-black">완납</button>
      </div>}

      <div className="mt-3 flex gap-4 text-xs">
        <button onClick={() => edit(item)} className="text-blue-400">수정</button>
        <button onClick={() => remove(item.id)} className="text-red-400">삭제</button>
      </div>
    </div>)}</div>
  </div>;
}
function ReceivableCalendar({ onSelect }: { onSelect: (date: string) => void }) { const [rows, setRows] = useState<Receivable[]>([]); useEffect(() => { getReceivables().then((r) => setRows((r.rows || []).filter((x) => x.status !== "완납" && x.balance > 0))).catch(() => {}); }, []); const dates = Array.from(new Set(rows.map((r) => r.date))).sort().reverse(); return <div className="mt-4 rounded-3xl bg-[#111A2E] p-4"><div className="mb-3 text-lg font-black">미수금 날짜</div>{!dates.length && <div className="text-sm text-slate-400">미수금이 있는 날짜가 없습니다.</div>}<div className="grid grid-cols-2 gap-2">{dates.map((d) => <button key={d} onClick={() => onSelect(d)} className="rounded-2xl bg-yellow-500/20 p-3 text-left font-bold text-yellow-200">{d}<br /><span className="text-xs">미수금 보기</span></button>)}</div></div>; }
function SettingsPage({ onChanged }: { onChanged: () => Promise<void> }) { const [employees, setEmployees] = useState<Employee[]>([]); const [name, setName] = useState(""); const load = async () => { const res = await getEmployees(); if (res.ok) setEmployees(res.rows || []); }; useEffect(() => { load().catch(() => {}); }, []); const add = async () => { const clean = name.trim(); if (!clean) return; await addEmployee(clean); setName(""); await load(); await onChanged(); }; const remove = async (id: string) => { if (!confirm("직원을 비활성화할까요? 과거 기록은 유지됩니다.")) return; await deactivateEmployee(id); await load(); await onChanged(); }; return <div className="space-y-4"><div className="rounded-3xl bg-[#111A2E] p-4"><div className="text-lg font-black">직원 관리</div><div className="mt-3 flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="직원명" className="h-12 flex-1 rounded-2xl bg-slate-800 px-4 text-white outline-none" /><button onClick={add} className="h-12 rounded-2xl bg-green-500 px-4 font-black">추가</button></div></div><div className="space-y-2">{employees.map((emp) => <div key={emp.id} className="flex items-center justify-between rounded-3xl bg-[#111A2E] p-4"><div><div className="font-black">{emp.name}</div><div className="text-xs text-slate-500">ID {emp.id}</div></div><button onClick={() => remove(emp.id)} className="text-sm text-red-400">비활성화</button></div>)}</div><div className="rounded-3xl bg-[#111A2E] p-4 text-sm text-slate-400">앱 버전: {APP_VERSION}</div></div>; }

export default function Page() {
  const [date, setDate] = useState(todayString());
  const [page, setPage] = useState<PageKey>("home");
  const [dashboard, setDashboard] = useState<Dashboard>(EMPTY_DASHBOARD);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>(FALLBACK_CATEGORIES);
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [apiReady, setApiReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [receivableDate, setReceivableDate] = useState<string | undefined>();
  const reloadSeq = useRef(0);

  const reload = useCallback(async (force = false) => {
    const seq = ++reloadSeq.current;
    try {
      setLoading(true);
      const initRes = await getInit(date, { force });
      if (seq !== reloadSeq.current) return;
      if (initRes.ok && initRes.home?.ok) {
        setDashboard(initRes.home.dashboard);
        setTransactions(initRes.home.rows || []);
        if (initRes.home.categories?.length) setCategories(initRes.home.categories);
        else if (initRes.categories?.ok && initRes.categories.rows?.length) setCategories(initRes.categories.rows);
      } else {
        const homeRes = await getHome(date, { force });
        if (seq !== reloadSeq.current) return;
        if (homeRes.ok) {
          setDashboard(homeRes.dashboard);
          setTransactions(homeRes.rows || []);
          if (homeRes.categories?.length) setCategories(homeRes.categories);
        }
      }
      setApiReady(true);
    } catch {
      if (seq !== reloadSeq.current) return;
      setApiReady(false);
      setDashboard({ ...EMPTY_DASHBOARD, date });
      setTransactions([]);
    } finally {
      if (seq === reloadSeq.current) setLoading(false);
    }
  }, [date]);

  useEffect(() => { reload(); setFilters(DEFAULT_FILTERS); }, [date, reload]);
  useEffect(() => {
    if (page === "settings") return;
    preloadDay(addDays(date, -1));
    preloadDay(addDays(date, 1));
  }, [page, date]);

  const saveTransaction = async (data: Parameters<typeof addTransaction>[0]) => {
    const row: Transaction = { ...data, id: makeLocalId() };
    if (row.date === date) {
      setTransactions((prev) => [row, ...prev]);
      setDashboard((prev) => adjustDashboard(prev, row, 1));
    } else if (row.method === "현금") {
      setDashboard((prev) => adjustDashboard(prev, row, 1));
    }
    void addTransaction(data).then((res) => { if (res.id) setTransactions((prev) => prev.map((r) => r.id === row.id ? { ...r, id: res.id! } : r)); }).catch(() => {
      if (row.date === date) setTransactions((prev) => prev.filter((r) => r.id !== row.id));
      setDashboard((prev) => adjustDashboard(prev, row, -1));
      alert("저장에 실패했습니다. 다시 시도해주세요.");
    });
  };

  const saveEdit = async (id: string, data: Parameters<typeof updateTransaction>[1]) => {
    const oldRow = transactions.find((r) => r.id === id) || editItem || null;
    const nextRow: Transaction = { ...data, id };
    setEditItem(null);
    const previous = transactions;
    setTransactions((prev) => {
      const removed = prev.filter((r) => r.id !== id);
      return nextRow.date === date ? [nextRow, ...removed] : removed;
    });
    if (oldRow) setDashboard((prev) => adjustDashboard(adjustDashboard(prev, oldRow, -1), nextRow, 1));
    void updateTransaction(id, data).catch(() => {
      setTransactions(previous);
      if (oldRow) setDashboard((prev) => adjustDashboard(adjustDashboard(prev, nextRow, -1), oldRow, 1));
      alert("수정에 실패했습니다. 다시 시도해주세요.");
    });
  };

  const removeTransaction = async (id: string) => {
    const target = transactions.find((r) => r.id === id);
    if (!confirm("삭제할까요?")) return;
    const previous = transactions;
    setTransactions((prev) => prev.filter((r) => r.id !== id));
    if (target) setDashboard((prev) => adjustDashboard(prev, target, -1));
    void deleteTransaction(id).catch(() => {
      setTransactions(previous);
      if (target) setDashboard((prev) => adjustDashboard(prev, target, 1));
      alert("삭제에 실패했습니다. 다시 시도해주세요.");
    });
  };

  const closeSheet = () => { setOpen(false); setEditItem(null); };
  const showFilter = (f: Partial<TransactionFilters>) => { setFilters((prev) => ({ ...prev, ...f })); setPage("home"); };
  const visible = useMemo(() => applyTransactionFilters(transactions, filters), [transactions, filters]);

  return <div className="min-h-screen bg-[#0B1220] text-white"><main className="mx-auto w-full max-w-md px-4 pb-48 pt-5"><Header onSettings={() => setPage("settings")} /><DateNavigator date={date} onChange={setDate} />{!apiReady && <div className="mt-3 rounded-2xl bg-yellow-500/15 p-3 text-sm text-yellow-200">API 연결을 확인해주세요.</div>}{page === "home" && <><DashboardView data={dashboard} onFilter={showFilter} onReceivable={() => { setPage("receivable"); setReceivableDate(undefined); }} /><div className="mt-5 flex items-center gap-2 text-lg font-black">🧾 거래내역 {loading && <span className="text-xs font-normal text-slate-400">새로고침 중...</span>}</div><TransactionFilterBar filters={filters} categories={categories} onChange={(next) => setFilters((f) => ({ ...f, ...next }))} onReset={() => setFilters(DEFAULT_FILTERS)} resultCount={visible.length} resultTotal={filterTotal(visible)} /><TransactionList items={visible} onDelete={removeTransaction} onEdit={(item) => { setEditItem(item); setOpen(true); }} /></>}{page === "stats" && <StatsPage />}{page === "personal" && <PersonalPage date={date} onChanged={reload} />}{page === "labor" && <LaborPage date={date} onChanged={reload} />}{page === "receivable" && <><ReceivableCalendar onSelect={(d) => setReceivableDate(d)} /><ReceivablePage onChanged={reload} focusDate={receivableDate} /></>}{page === "settings" && <SettingsPage onChanged={reload} />}</main><BottomNav page={page} onPage={setPage} onAdd={() => setOpen(true)} /><InputSheet open={open} date={date} editItem={editItem} onClose={closeSheet} onSave={saveTransaction} onUpdate={saveEdit} /></div>;
}
