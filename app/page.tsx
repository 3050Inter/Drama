"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  Landmark,
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserRoundCheck,
  Wallet,
} from "lucide-react";
import {
  addEmployee,
  addLabor,
  addReceivable,
  addTransaction,
  completeReceivable,
  deactivateEmployee,
  deleteLabor,
  deleteReceivable,
  deleteTransaction,
  getHome,
  getEmployees,
  getExpenseCategories,
  getLabor,
  getMonthly,
  getReceivables,
  payReceivable,
  updateTransaction,
} from "@/lib/api";
import { addDays, addMonths, currentMonth, money, monthLabel, todayString } from "@/lib/formatter";
import type {
  Dashboard,
  DailySales,
  Employee,
  ExpenseCategory,
  LaborEntry,
  LaborSummaryByEmployee,
  MonthlySummary,
  PageKey,
  PaymentMethod,
  Receivable,
  ReceivableSummary,
  Transaction,
  TransactionType,
} from "@/lib/types";

const EMPTY_DASHBOARD: Dashboard = {
  date: todayString(),
  totalSales: 0,
  totalExpense: 0,
  profit: 0,
  cardSales: 0,
  cashSales: 0,
  bankSales: 0,
  laborExpense: 0,
  receivableBalance: 0,
  receivableCount: 0,
  transactionCount: 0,
};

const EMPTY_RECEIVABLE_SUMMARY: ReceivableSummary = {
  totalBalance: 0,
  count: 0,
  paidTotal: 0,
};

function Header({ onSettings }: { onSettings: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="w-12" />
      <h1 className="text-center text-2xl font-black">🎬 드라마 LIVE</h1>
      <button
        onClick={onSettings}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111A2E] text-slate-200 shadow-md active:scale-95"
      >
        <Settings size={24} />
      </button>
    </div>
  );
}

function DateNavigator({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <button onClick={() => onChange(addDays(date, -1))} className="flex h-12 w-14 items-center justify-center rounded-2xl bg-[#111A2E]">
        <ChevronLeft size={22} />
      </button>

      <label className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#111A2E] px-3 font-bold">
        <CalendarDays size={17} className="text-slate-300" />
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-center text-white outline-none"
        />
      </label>

      <button onClick={() => onChange(addDays(date, 1))} className="flex h-12 w-14 items-center justify-center rounded-2xl bg-[#111A2E]">
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

function BottomNav({ page, onPage, onAdd }: { page: PageKey; onPage: (page: PageKey) => void; onAdd: () => void }) {
  const item = (key: PageKey, Icon: any, label: string) => (
    <button
      onClick={() => onPage(key)}
      className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition ${
        page === key ? "-translate-y-1 text-green-400" : "text-slate-400"
      }`}
    >
      <Icon size={23} />
      <span className="text-[12px] font-bold">{label}</span>
      {page === key && <div className="h-1 w-6 rounded-full bg-green-400" />}
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
      <div className="relative h-24 w-full max-w-md border-t border-slate-800 bg-[#0B1220]/95 px-2 pt-2 backdrop-blur">
        <div className="flex h-full items-start justify-between gap-1">
          {item("home", Home, "홈")}
          {item("monthly", BarChart3, "월별")}
          <div className="w-20" />
          {item("labor", UserRoundCheck, "인건비")}
          {item("receivable", Banknote, "미수금")}
        </div>

        <button
          onClick={onAdd}
          className="absolute -top-7 left-1/2 flex h-[70px] w-[70px] -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-2xl transition active:scale-95"
        >
          <Plus size={38} />
        </button>
      </div>
    </div>
  );
}

function DashboardView({ data }: { data: Dashboard }) {
  const box = (title: string, value: number, color: string) => (
    <div className="rounded-3xl bg-[#111A2E] p-4 shadow-sm">
      <div className="text-sm text-slate-300">{title}</div>
      <div className={`mt-1 font-black ${color}`}>₩ {money(value)}</div>
    </div>
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-3xl bg-green-500 p-5 shadow-lg">
        <div className="text-sm font-bold opacity-90">오늘 순이익</div>
        <div className="mt-1 text-3xl font-black">₩ {money(data.profit)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {box("총매출", data.totalSales, "text-green-400")}
        {box("총지출", data.totalExpense, "text-red-400")}
        {box("현재 미수금", data.receivableBalance || 0, "text-yellow-400")}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {box("카드", data.cardSales, "text-blue-400")}
        {box("현금", data.cashSales, "text-orange-400")}
        {box("계좌", data.bankSales, "text-purple-400")}
      </div>
    </div>
  );
}

function TransactionList({ items, onDelete, onEdit }: { items: Transaction[]; onDelete: (id: string) => void; onEdit: (item: Transaction) => void }) {
  if (!items.length) return <div className="mt-4 rounded-3xl bg-[#111A2E] p-8 text-center text-sm text-slate-400">거래내역이 없습니다.</div>;

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => {
        const Icon = item.method === "카드" ? CreditCard : item.method === "현금" ? Wallet : item.method === "계좌" ? Landmark : UserRoundCheck;
        const auto = item.id.startsWith("TX-LABOR-") || item.category === "TC인건비";

        return (
          <div key={item.id} className="rounded-3xl bg-[#111A2E] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-bold">
                  <Icon size={18} />
                  {item.method}
                  {item.type === "지출" && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">지출</span>}
                  {auto && <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-xs text-pink-300">자동</span>}
                </div>
                {item.memo && <div className="mt-2 text-sm text-slate-300">📝 {item.memo}</div>}
                {item.category && <div className="mt-1 text-sm text-slate-400">📂 {item.category}</div>}
                <div className="mt-1 text-xs text-slate-500">{item.date}</div>
              </div>

              <div className="text-right">
                <div className="text-lg font-black">₩ {money(item.amount)}</div>
                {!auto && (
                  <div className="mt-2 flex justify-end gap-3">
                    <button onClick={() => onEdit(item)} className="inline-flex items-center gap-1 text-xs text-blue-400">
                      <Pencil size={14} />수정
                    </button>
                    <button onClick={() => onDelete(item.id)} className="inline-flex items-center gap-1 text-xs text-red-400">
                      <Trash2 size={14} />삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InputSheet({
  open,
  date,
  editItem,
  onClose,
  onSave,
  onUpdate,
}: {
  open: boolean;
  date: string;
  editItem?: Transaction | null;
  onClose: () => void;
  onSave: (data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) => Promise<void>;
  onUpdate: (id: string, data: { date: string; type: TransactionType; method: PaymentMethod; amount: number; category: string; memo: string }) => Promise<void>;
}) {
  const [type, setType] = useState<TransactionType>("매출");
  const [method, setMethod] = useState<PaymentMethod>("카드");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    getExpenseCategories()
      .then((res) => {
        const rows = res.rows || [];
        setCategories(rows);
        if (rows.length && !category) setCategory(rows[0].name);
      })
      .catch(() => {
        const fallback = [
          { name: "주류매입", active: "Y", order: 1 },
          { name: "안주재료", active: "Y", order: 2 },
          { name: "월세", active: "Y", order: 3 },
          { name: "공과금", active: "Y", order: 4 },
          { name: "비품", active: "Y", order: 5 },
          { name: "기타지출", active: "Y", order: 6 },
        ];
        setCategories(fallback);
        setCategory(fallback[0].name);
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (editItem) {
      setType(editItem.type);
      setMethod(editItem.method === "인건비" ? "카드" : editItem.method);
      setAmount(String(editItem.amount || ""));
      setMemo(editItem.memo || "");
      setCategory(editItem.category || "");
    } else {
      setType("매출");
      setMethod("카드");
      setAmount("");
      setMemo("");
      setCategory(categories[0]?.name || "");
    }
  }, [open, editItem]);

  if (!open) return null;

  const save = async () => {
    const value = Number(amount.replace(/,/g, ""));
    if (!value) {
      alert("금액을 입력해주세요.");
      return;
    }

    const payload = {
      date: editItem?.date || date,
      type,
      method,
      amount: value,
      category: type === "지출" ? category : "",
      memo,
    };

    try {
      setSaving(true);
      if (editItem) await onUpdate(editItem.id, payload);
      else await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-md rounded-t-[28px] bg-[#111827] p-5 shadow-2xl">
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-slate-600" />
          <div className="mb-4 text-lg font-black">{editItem ? "거래 수정" : "빠른 입력"}</div>

          <div className="grid grid-cols-2 gap-2">
            {(["매출", "지출"] as TransactionType[]).map((v) => (
              <button key={v} onClick={() => setType(v)} className={`h-12 rounded-2xl font-bold ${type === v ? "bg-green-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                {v}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["카드", "현금", "계좌"] as PaymentMethod[]).map((v) => (
              <button key={v} onClick={() => setMethod(v)} className={`h-11 rounded-2xl font-bold ${method === v ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                {v}
              </button>
            ))}
          </div>

          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="금액" className="mt-4 h-14 w-full rounded-2xl bg-slate-800 px-4 text-xl font-black text-white outline-none" />

          {type === "지출" && (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none">
              {categories.map((item) => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          )}

          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />

          <button disabled={saving} onClick={save} className="mt-4 h-14 w-full rounded-2xl bg-green-500 text-lg font-black text-white disabled:opacity-60">
            {saving ? "저장 중..." : editItem ? "수정 저장" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}

function MonthlyPage() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<MonthlySummary>({ ...EMPTY_DASHBOARD, month });
  const [daily, setDaily] = useState<DailySales[]>([]);
  const [labor, setLabor] = useState({ totalTc: 0, totalAmount: 0, byEmployee: [] as LaborSummaryByEmployee[] });
  const [ready, setReady] = useState(true);

  const load = async () => {
    try {
      const res = await getMonthly(month);
      if (res.ok) {
        setSummary(res.monthly);
        setDaily(res.dailySales || []);
        setLabor(res.laborSummary);
        setReady(true);
      }
    } catch (e) {
      setReady(false);
      setSummary({ ...EMPTY_DASHBOARD, month });
      setDaily([]);
      setLabor({ totalTc: 0, totalAmount: 0, byEmployee: [] });
    }
  };

  useEffect(() => {
    load();
  }, [month]);

  const max = Math.max(1, ...daily.map((d) => d.sales));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth(addMonths(month, -1))} className="flex h-12 w-14 items-center justify-center rounded-2xl bg-[#111A2E]"><ChevronLeft size={22} /></button>
        <label className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#111A2E] px-3 font-black">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-transparent text-center text-white outline-none" />
        </label>
        <button onClick={() => setMonth(addMonths(month, 1))} className="flex h-12 w-14 items-center justify-center rounded-2xl bg-[#111A2E]"><ChevronRight size={22} /></button>
      </div>

      {!ready && <div className="rounded-2xl bg-yellow-500/15 p-3 text-sm text-yellow-200">API 연결을 확인해주세요.</div>}

      <div className="text-xl font-black">📅 {monthLabel(month)}</div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ["월 매출", summary.totalSales, "text-green-400"],
          ["월 지출", summary.totalExpense, "text-red-400"],
          ["월 순이익", summary.profit, "text-blue-400"],
        ].map(([title, value, cls]: any) => (
          <div key={title} className="rounded-3xl bg-[#111A2E] p-4">
            <div className="text-sm text-slate-300">{title}</div>
            <div className={`mt-1 font-black ${cls}`}>₩ {money(value)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-[#111A2E] p-4">
        <div className="font-black">결제수단</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>카드<br /><b className="text-blue-400">₩ {money(summary.cardSales)}</b></div>
          <div>현금<br /><b className="text-orange-400">₩ {money(summary.cashSales)}</b></div>
          <div>계좌<br /><b className="text-purple-400">₩ {money(summary.bankSales)}</b></div>
        </div>
      </div>

      <div className="rounded-3xl bg-[#111A2E] p-4">
        <div className="font-black">직원별 TC</div>
        {!labor.byEmployee.length && <div className="mt-3 text-sm text-slate-400">인건비 내역이 없습니다.</div>}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {labor.byEmployee.map((item) => (
            <div key={item.employee} className="rounded-2xl bg-slate-800 p-3">
              <div className="font-black">{item.employee}</div>
              <div className="text-sm text-slate-300">TC {item.tc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-[#111A2E] p-4">
        <div className="font-black">일별 매출</div>
        <div className="mt-3 space-y-2">
          {daily.filter((d) => d.sales > 0).map((d) => (
            <div key={d.date} className="flex items-center gap-2 text-xs">
              <div className="w-8 text-slate-400">{Number(d.date.slice(8, 10))}일</div>
              <div className="h-4 flex-1 overflow-hidden rounded bg-slate-800">
                <div className="h-full bg-green-500" style={{ width: `${Math.max(4, (d.sales / max) * 100)}%` }} />
              </div>
              <div className="w-20 text-right">₩ {money(d.sales)}</div>
            </div>
          ))}
          {!daily.some((d) => d.sales > 0) && <div className="text-sm text-slate-400">매출 데이터가 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}

function LaborPage({ date, onChanged }: { date: string; onChanged: () => Promise<void> }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employee, setEmployee] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [tc, setTc] = useState("");
  const [memo, setMemo] = useState("");
  const [rows, setRows] = useState<LaborEntry[]>([]);
  const [summary, setSummary] = useState({ totalTc: 0, totalAmount: 0, byEmployee: [] as LaborSummaryByEmployee[] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [empRes, laborRes] = await Promise.all([getEmployees(), getLabor(date)]);
    if (empRes.ok) {
      const active = empRes.rows || [];
      setEmployees(active);
      if (active.length && !employee) setEmployee(active[0].name);
    }
    if (laborRes.ok) {
      setRows(laborRes.rows || []);
      setSummary(laborRes.summary);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [date]);

  const save = async () => {
    const tcValue = Number(tc.replace(/,/g, ""));

    if (!employee) {
      alert("직원을 선택해주세요.");
      return;
    }
    if (!tcValue) {
      alert("TC를 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      await addLabor({ date, employee, tableNo, tc: tcValue, memo });
      setTableNo("");
      setTc("");
      setMemo("");
      await load();
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("인건비 내역을 삭제할까요?")) return;
    await deleteLabor(id);
    await load();
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-pink-500 p-5">
        <div className="text-sm font-bold opacity-90">오늘 TC</div>
        <div className="mt-1 text-3xl font-black">TC {summary.totalTc}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {summary.byEmployee.map((item) => (
          <div key={item.employee} className="rounded-3xl bg-[#111A2E] p-4">
            <div className="font-black">{item.employee}</div>
            <div className="mt-1 text-sm text-slate-300">TC {item.tc}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-[#111A2E] p-4">
        <div className="mb-3 text-lg font-black">인건비 입력</div>
        <select value={employee} onChange={(e) => setEmployee(e.target.value)} className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none">
          {employees.map((emp) => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
        </select>
        <input value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="테이블번호" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input inputMode="numeric" value={tc} onChange={(e) => setTc(e.target.value.replace(/[^0-9]/g, ""))} placeholder="TC" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <button disabled={saving} onClick={save} className="mt-4 h-14 w-full rounded-2xl bg-pink-500 text-lg font-black text-white disabled:opacity-60">
          {saving ? "저장 중..." : "인건비 저장"}
        </button>
      </div>

      <div>
        <div className="mb-2 text-lg font-black">오늘 인건비 내역</div>
        {!rows.length && <div className="rounded-3xl bg-[#111A2E] p-6 text-center text-sm text-slate-400">인건비 내역이 없습니다.</div>}
        <div className="space-y-3">
          {rows.map((item) => (
            <div key={item.id} className="rounded-3xl bg-[#111A2E] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-black">{item.employee}</div>
                  <div className="mt-1 text-sm text-slate-300">테이블 {item.tableNo || "-"} / TC {item.tc}</div>
                  {item.memo && <div className="mt-1 text-sm text-slate-400">📝 {item.memo}</div>}
                </div>
                <div className="text-right">
                  <button onClick={() => remove(item.id)} className="inline-flex items-center gap-1 text-xs text-red-400">
                    <Trash2 size={14} />삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReceivablePage({ onChanged }: { onChanged: () => Promise<void> }) {
  const [rows, setRows] = useState<Receivable[]>([]);
  const [summary, setSummary] = useState(EMPTY_RECEIVABLE_SUMMARY);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("");
  const [memo, setMemo] = useState("");
  const [payAmount, setPayAmount] = useState<Record<string, string>>({});

  const load = async () => {
    const res = await getReceivables();
    if (res.ok) {
      setRows(res.rows || []);
      setSummary(res.summary);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const save = async () => {
    const value = Number(amount.replace(/,/g, ""));
    const paidValue = Number(paid.replace(/,/g, ""));

    if (!name.trim()) {
      alert("손님명을 입력해주세요.");
      return;
    }
    if (!value) {
      alert("발생금액을 입력해주세요.");
      return;
    }

    await addReceivable({
      date: todayString(),
      name: name.trim(),
      phone,
      amount: value,
      paid: paidValue || 0,
      memo,
    });

    setName("");
    setPhone("");
    setAmount("");
    setPaid("");
    setMemo("");

    await load();
    await onChanged();
  };

  const pay = async (id: string) => {
    const value = Number((payAmount[id] || "").replace(/,/g, ""));
    if (!value) {
      alert("입금액을 입력해주세요.");
      return;
    }

    await payReceivable(id, value);
    setPayAmount((prev) => ({ ...prev, [id]: "" }));
    await load();
    await onChanged();
  };

  const complete = async (id: string) => {
    if (!confirm("완납 처리할까요?")) return;
    await completeReceivable(id);
    await load();
    await onChanged();
  };

  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await deleteReceivable(id);
    await load();
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-yellow-500 p-5">
        <div className="text-sm font-bold opacity-90">현재 미수금</div>
        <div className="mt-1 text-3xl font-black">₩ {money(summary.totalBalance)}</div>
        <div className="mt-1 text-sm">{summary.count}건 / 회수 ₩ {money(summary.paidTotal)}</div>
      </div>

      <div className="rounded-3xl bg-[#111A2E] p-4">
        <div className="mb-3 text-lg font-black">미수금 등록</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="손님명" className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호(선택)" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="발생금액" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input inputMode="numeric" value={paid} onChange={(e) => setPaid(e.target.value.replace(/[^0-9]/g, ""))} placeholder="입금금액(있으면)" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none" />
        <button onClick={save} className="mt-4 h-14 w-full rounded-2xl bg-yellow-500 text-lg font-black text-white">미수금 저장</button>
      </div>

      <div>
        <div className="mb-2 text-lg font-black">미수금 내역</div>
        {!rows.length && <div className="rounded-3xl bg-[#111A2E] p-6 text-center text-sm text-slate-400">미수금 내역이 없습니다.</div>}
        <div className="space-y-3">
          {rows.map((item) => (
            <div key={item.id} className="rounded-3xl bg-[#111A2E] p-4">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-black">{item.name}</div>
                  {item.phone && <div className="mt-1 text-sm text-slate-400">{item.phone}</div>}
                  {item.memo && <div className="mt-1 text-sm text-slate-300">📝 {item.memo}</div>}
                  <div className="mt-1 text-xs text-slate-500">{item.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">잔액</div>
                  <div className={`font-black ${item.status === "완납" ? "text-green-400" : "text-yellow-300"}`}>₩ {money(item.balance)}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.status}</div>
                </div>
              </div>

              {item.status !== "완납" && (
                <div className="mt-3 flex gap-2">
                  <input
                    inputMode="numeric"
                    value={payAmount[item.id] || ""}
                    onChange={(e) => setPayAmount((prev) => ({ ...prev, [item.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="입금액"
                    className="h-11 flex-1 rounded-2xl bg-slate-800 px-3 text-white outline-none"
                  />
                  <button onClick={() => pay(item.id)} className="h-11 rounded-2xl bg-blue-500 px-3 text-sm font-black">입금</button>
                  <button onClick={() => complete(item.id)} className="h-11 rounded-2xl bg-green-500 px-3 text-sm font-black">완납</button>
                </div>
              )}

              <button onClick={() => remove(item.id)} className="mt-3 text-xs text-red-400">삭제</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ onChanged }: { onChanged: () => Promise<void> }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");

  const load = async () => {
    const res = await getEmployees();
    if (res.ok) setEmployees(res.rows || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const add = async () => {
    const clean = name.trim();
    if (!clean) return;
    await addEmployee(clean);
    setName("");
    await load();
    await onChanged();
  };

  const remove = async (id: string) => {
    if (!confirm("직원을 비활성화할까요? 과거 기록은 유지됩니다.")) return;
    await deactivateEmployee(id);
    await load();
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-[#111A2E] p-4">
        <div className="text-lg font-black">직원 관리</div>
        <div className="mt-3 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="직원명" className="h-12 flex-1 rounded-2xl bg-slate-800 px-4 text-white outline-none" />
          <button onClick={add} className="h-12 rounded-2xl bg-green-500 px-4 font-black">추가</button>
        </div>
      </div>

      <div className="space-y-2">
        {employees.map((emp) => (
          <div key={emp.id} className="flex items-center justify-between rounded-3xl bg-[#111A2E] p-4">
            <div>
              <div className="font-black">{emp.name}</div>
              <div className="text-xs text-slate-500">ID {emp.id}</div>
            </div>
            <button onClick={() => remove(emp.id)} className="text-sm text-red-400">비활성화</button>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-[#111A2E] p-4 text-sm text-slate-400">
        앱 버전: V6.6 / UI 리뉴얼 + 미수금 관리 포함
      </div>
    </div>
  );
}

export default function Page() {
  const [date, setDate] = useState(todayString());
  const [page, setPage] = useState<PageKey>("home");
  const [dashboard, setDashboard] = useState<Dashboard>(EMPTY_DASHBOARD);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [apiReady, setApiReady] = useState(true);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    try {
      setLoading(true);
      const homeRes = await getHome(date);

      if (homeRes.ok) {
        setDashboard(homeRes.dashboard);
        setTransactions(homeRes.rows || []);
      }

      setApiReady(true);
    } catch (err) {
      setApiReady(false);
      setDashboard({ ...EMPTY_DASHBOARD, date });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [date]);

  const saveTransaction = async (data: Parameters<typeof addTransaction>[0]) => {
    await addTransaction(data);
    await reload();
  };

  const saveEdit = async (id: string, data: Parameters<typeof updateTransaction>[1]) => {
    await updateTransaction(id, data);
    setEditItem(null);
    await reload();
  };

  const removeTransaction = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await deleteTransaction(id);
    await reload();
  };

  const closeSheet = () => {
    setOpen(false);
    setEditItem(null);
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <main className="mx-auto w-full max-w-md px-4 pb-36 pt-5">
        <Header onSettings={() => setPage("settings")} />
        <DateNavigator date={date} onChange={setDate} />

        {!apiReady && <div className="mt-3 rounded-2xl bg-yellow-500/15 p-3 text-sm text-yellow-200">API 연결을 확인해주세요.</div>}

        {page === "home" && (
          <>
            <DashboardView data={dashboard} />
            <div className="mt-5 flex items-center gap-2 text-lg font-black">
              🧾 거래내역 {loading && <span className="text-xs font-normal text-slate-400">새로고침 중...</span>}
            </div>
            <TransactionList items={transactions} onDelete={removeTransaction} onEdit={(item) => { setEditItem(item); setOpen(true); }} />
          </>
        )}

        {page === "monthly" && <MonthlyPage />}
        {page === "labor" && <LaborPage date={date} onChanged={reload} />}
        {page === "receivable" && <ReceivablePage onChanged={reload} />}
        {page === "settings" && <SettingsPage onChanged={reload} />}
      </main>

      <BottomNav page={page} onPage={setPage} onAdd={() => setOpen(true)} />

      <InputSheet
        open={open}
        date={date}
        editItem={editItem}
        onClose={closeSheet}
        onSave={saveTransaction}
        onUpdate={saveEdit}
      />
    </div>
  );
}
