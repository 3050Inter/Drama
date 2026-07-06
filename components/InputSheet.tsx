"use client";

import { useEffect, useState } from "react";
import type { ExpenseCategory, PaymentMethod, TransactionType } from "@/lib/types";
import { getExpenseCategories } from "@/lib/api";

interface Props {
  open: boolean;
  date: string;
  onClose: () => void;
  onSave: (data: {
    date: string;
    type: TransactionType;
    method: PaymentMethod;
    amount: number;
    category: string;
    memo: string;
  }) => Promise<void>;
}

export default function InputSheet({ open, date, onClose, onSave }: Props) {
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
        if (rows.length && !category) {
          setCategory(rows[0].name);
        }
      })
      .catch(() => {
        const fallback = [
          { name: "주류매입", active: "Y", order: 1 },
          { name: "안주재료", active: "Y", order: 2 },
          { name: "인건비", active: "Y", order: 3 },
          { name: "월세", active: "Y", order: 4 },
          { name: "공과금", active: "Y", order: 5 },
          { name: "비품", active: "Y", order: 6 },
          { name: "기타지출", active: "Y", order: 7 },
        ];
        setCategories(fallback);
        setCategory(fallback[0].name);
      });
  }, [open]);

  if (!open) return null;

  const save = async () => {
    const value = Number(String(amount).replace(/,/g, ""));

    if (!value) {
      alert("금액을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      await onSave({
        date,
        type,
        method,
        amount: value,
        category: type === "지출" ? category : "",
        memo,
      });

      setAmount("");
      setMemo("");
      setCategory(categories[0]?.name || "");
      setType("매출");
      setMethod("카드");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-md rounded-t-3xl bg-[#111827] p-5 shadow-2xl">
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-slate-600" />

          <div className="mb-4 text-lg font-black">빠른 입력</div>

          <div className="grid grid-cols-2 gap-2">
            {(["매출", "지출"] as TransactionType[]).map((v) => (
              <button
                key={v}
                onClick={() => setType(v)}
                className={`h-12 rounded-xl font-bold ${
                  type === v ? "bg-green-500 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["카드", "현금", "계좌"] as PaymentMethod[]).map((v) => (
              <button
                key={v}
                onClick={() => setMethod(v)}
                className={`h-11 rounded-xl font-bold ${
                  method === v ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="금액"
            className="mt-4 h-14 w-full rounded-xl bg-slate-800 px-4 text-xl font-black text-white outline-none"
          />

          {type === "지출" && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-3 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none"
            >
              {categories.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          )}

          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모"
            className="mt-3 h-12 w-full rounded-xl bg-slate-800 px-4 text-white outline-none"
          />

          <button
            disabled={saving}
            onClick={save}
            className="mt-4 h-14 w-full rounded-xl bg-green-500 text-lg font-black text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}
