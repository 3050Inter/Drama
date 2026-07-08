"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import {
  addReceivable,
  deleteReceivable,
  getReceivables,
  payReceivable,
  completeReceivable,
  updateReceivable,
} from "@/lib/api";
import { money, todayString } from "@/lib/formatter";
import type { PaymentMethod, Receivable } from "@/lib/types";

type Summary = {
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  openCount: number;
  closedCount: number;
};

export default function ReceivablePage({
  onChanged,
}: {
  onChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<Receivable[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalAmount: 0,
    totalPaid: 0,
    totalBalance: 0,
    openCount: 0,
    closedCount: 0,
  });

  const [date, setDate] = useState(todayString());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [editing, setEditing] = useState<Receivable | null>(null);

  const load = async () => {
    const res = await getReceivables();

    if (res.ok) {
      setRows(res.rows || []);

      const s: any = res.summary || {};
      setSummary({
        totalAmount: Number(s.totalAmount || 0),
        totalPaid: Number(s.totalPaid ?? s.paidTotal ?? 0),
        totalBalance: Number(s.totalBalance || 0),
        openCount: Number(s.openCount ?? s.count ?? 0),
        closedCount: Number(s.closedCount || 0),
      });
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const reset = () => {
    setEditing(null);
    setDate(todayString());
    setName("");
    setPhone("");
    setAmount("");
    setMemo("");
  };

  const summarizeReceivables = (items: Receivable[]): Summary => ({
    totalAmount: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    totalPaid: items.reduce((sum, item) => sum + Number(item.paid || 0), 0),
    totalBalance: items.reduce((sum, item) => sum + Number(item.balance || 0), 0),
    openCount: items.filter((item) => item.status !== "완납" && Number(item.balance || 0) > 0).length,
    closedCount: items.filter((item) => item.status === "완납" || Number(item.balance || 0) <= 0).length,
  });

  const applyRows = (items: Receivable[]) => {
    setRows(items);
    setSummary(summarizeReceivables(items));
  };

  const save = () => {
    const value = Number(amount.replace(/,/g, ""));

    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    if (!value) {
      alert("금액을 입력해주세요.");
      return;
    }

    const prevRows = rows;

    if (editing) {
      const nextRows = rows.map((item) => {
        if (item.id !== editing.id) return item;
        const paidValue = Number(item.paid || 0);
        const balanceValue = Math.max(value - paidValue, 0);
        return {
          ...item,
          date,
          name,
          phone,
          amount: value,
          memo,
          balance: balanceValue,
          status: balanceValue <= 0 ? "완납" : paidValue > 0 ? "일부입금" : "미수",
        } as Receivable;
      });
      applyRows(nextRows);
      const editingId = editing.id;
      const editingPaid = editing.paid;
      reset();
      updateReceivable(editingId, { date, name, phone, amount: value, paid: editingPaid, memo })
        .then((res: any) => {
          if (!res?.ok) throw new Error(res?.error || "미수금 수정 실패");
          
          void onChanged().catch(() => {});
        })
        .catch((err) => {
          applyRows(prevRows);
          alert(err?.message || "미수금 수정에 실패했습니다. 다시 시도해주세요.");
        });
      return;
    }

    const tempId = `temp-receivable-${Date.now()}`;
    const optimistic: Receivable = {
      id: tempId,
      date,
      name,
      phone,
      amount: value,
      paid: 0,
      balance: value,
      status: "미수",
      memo,
      payments: [],
    };
    applyRows([optimistic, ...prevRows]);
    reset();
    addReceivable({ date, name, phone, amount: value, paid: 0, memo })
      .then((res: any) => {
        if (!res?.ok) throw new Error(res?.error || "미수금 등록 실패");
        setRows((current) => current.map((item) => (item.id === tempId ? { ...item, id: res.id || item.id } : item)));
        
        void onChanged().catch(() => {});
      })
      .catch((err) => {
        applyRows(prevRows);
        alert(err?.message || "미수금 등록에 실패했습니다. 다시 시도해주세요.");
      });
  };

  const edit = (item: Receivable) => {
    setEditing(item);
    setDate(item.date);
    setName(item.name);
    setPhone(item.phone);
    setAmount(String(item.amount));
    setMemo(item.memo);
  };

  const askPaymentMethod = (): PaymentMethod | null => {
    const method = (prompt("결제방법을 입력하세요 (카드/현금/계좌)", "현금") || "").trim();

    if (method === "카드" || method === "현금" || method === "계좌") {
      return method;
    }

    if (method) alert("결제방법은 카드, 현금, 계좌 중 하나로 입력해주세요.");
    return null;
  };

  const pay = (id: string, full?: boolean, balance?: number) => {
    const value = full
      ? balance || 0
      : Number((prompt("입금금액을 입력하세요") || "0").replace(/,/g, ""));

    if (!value) return;

    const method = askPaymentMethod();
    if (!method) return;

    const memoText = prompt("입금 메모(선택)") || "";
    const prevRows = rows;
    const paymentId = `temp-payment-${Date.now()}`;
    const paymentDate = todayString();

    const nextRows = rows.map((item) => {
      if (item.id !== id) return item;
      const paidAmount = Math.min(value, Number(item.balance || value));
      const newPaid = Number(item.paid || 0) + paidAmount;
      const newBalance = Math.max(Number(item.amount || 0) - newPaid, 0);
      const newStatus = newBalance <= 0 ? "완납" : "일부입금";
      return {
        ...item,
        paid: newPaid,
        balance: newBalance,
        status: newStatus,
        payments: [
          ...(item.payments || []),
          {
            id: paymentId,
            date: paymentDate,
            receivableId: item.id,
            name: item.name,
            status: full ? "완납" : "일부입금",
            method,
            amount: paidAmount,
            balance: newBalance,
            memo: full ? memoText || "완납" : memoText,
          },
        ],
      } as Receivable;
    });

    applyRows(nextRows);

    const request = full
      ? completeReceivable(id, method, memoText || "완납")
      : payReceivable(id, value, method, memoText);

    request
      .then((res: any) => {
        if (!res?.ok) throw new Error(res?.error || "입금 처리 실패");
        
        void onChanged().catch(() => {});
      })
      .catch((err) => {
        applyRows(prevRows);
        alert(err?.message || "입금 처리에 실패했습니다. 다시 시도해주세요.");
      });
  };

  const remove = (id: string) => {
    if (!confirm("미수금 내역을 삭제할까요?")) return;

    const prevRows = rows;
    applyRows(prevRows.filter((item) => item.id !== id));

    deleteReceivable(id)
      .then((res: any) => {
        if (!res?.ok) throw new Error(res?.error || "삭제 실패");
        
        void onChanged().catch(() => {});
      })
      .catch((err) => {
        applyRows(prevRows);
        alert(err?.message || "삭제에 실패했습니다. 다시 시도해주세요.");
      });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] bg-yellow-500 p-5">
          <div className="text-sm font-bold opacity-90">현재 미수금</div>
          <div className="mt-1 text-2xl font-black">
            ₩ {money(summary.totalBalance)}
          </div>
          <div className="mt-1 text-sm">{summary.openCount}건</div>
        </div>

        <div className="rounded-[24px] bg-[#111A2E] p-5">
          <div className="text-sm text-slate-300">회수금액</div>
          <div className="mt-1 text-xl font-black text-green-400">
            ₩ {money(summary.totalPaid)}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] bg-[#111A2E] p-4">
        <div className="mb-3 text-lg font-black">
          {editing ? "미수금 수정" : "미수금 등록"}
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"
        />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="손님명"
          className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="전화번호(선택)"
          className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"
        />

        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="발생금액"
          className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"
        />

        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모"
          className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            className="h-14 flex-1 rounded-2xl bg-yellow-500 text-lg font-black text-white"
          >
            {editing ? "수정 저장" : "등록"}
          </button>

          {editing && (
            <button
              onClick={reset}
              className="h-14 rounded-2xl bg-slate-700 px-4 font-bold"
            >
              취소
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((item) => (
          <div key={item.id} className="rounded-[24px] bg-[#111A2E] p-4">
            <div className="flex justify-between gap-4">
              <div>
                <div className="font-black">
                  {item.name}
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                      item.status === "완납"
                        ? "bg-green-500/20 text-green-300"
                        : item.status === "일부입금"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {item.phone && (
                  <div className="mt-1 text-sm text-slate-400">{item.phone}</div>
                )}

                {item.memo && (
                  <div className="mt-1 text-sm text-slate-300">📝 {item.memo}</div>
                )}

                <div className="mt-1 text-xs text-slate-500">{item.date}</div>
              </div>

              <div className="text-right">
                <div className="font-black text-yellow-300">
                  잔액 ₩ {money(item.balance)}
                </div>
                <div className="text-xs text-slate-400">
                  발생 ₩ {money(item.amount)} / 입금 ₩ {money(item.paid)}
                </div>
              </div>
            </div>

            {!!item.payments?.length && (
              <div className="mt-3 rounded-2xl bg-slate-900/60 p-3 text-xs">
                <div className="mb-2 font-bold text-slate-300">입금내역</div>
                <div className="space-y-1.5">
                  {item.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 text-slate-300"
                    >
                      <div>
                        <span className="text-slate-500">{p.date}</span>
                        <span className="ml-2 rounded-full bg-yellow-500/15 px-2 py-0.5 text-yellow-300">
                          {p.status}
                        </span>
                        <span className="ml-2 text-blue-300">{p.method}</span>
                        {p.memo && <span className="ml-2 text-slate-400">{p.memo}</span>}
                      </div>
                      <div className="text-right">
                        <div className="font-black text-green-300">₩ {money(p.amount)}</div>
                        <div className="text-[11px] text-slate-500">잔액 ₩ {money(p.balance)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-end gap-3 text-xs">
              <button onClick={() => edit(item)} className="text-blue-400">
                수정
              </button>

              {item.balance > 0 && (
                <button
                  onClick={() => pay(item.id, false, item.balance)}
                  className="text-green-400"
                >
                  입금
                </button>
              )}

              {item.balance > 0 && (
                <button
                  onClick={() => pay(item.id, true, item.balance)}
                  className="inline-flex items-center gap-1 text-green-300"
                >
                  <CheckCircle2 size={14} />
                  완납
                </button>
              )}

              <button
                onClick={() => remove(item.id)}
                className="inline-flex items-center gap-1 text-red-400"
              >
                <Trash2 size={14} />
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
