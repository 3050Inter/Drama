"use client";

import type { Transaction } from "@/lib/types";
import { money } from "@/lib/formatter";
import { CreditCard, Landmark, Trash2, Wallet } from "lucide-react";

interface Props {
  items: Transaction[];
  onDelete: (id: string) => void;
}

export default function TransactionList({ items, onDelete }: Props) {
  if (!items.length) {
    return (
      <div className="mt-4 rounded-2xl bg-[#111A2E] p-8 text-center text-sm text-slate-400">
        거래내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => {
        const Icon =
          item.method === "카드" ? CreditCard : item.method === "현금" ? Wallet : Landmark;

        return (
          <div key={item.id} className="rounded-2xl bg-[#111A2E] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-bold">
                  <Icon size={18} />
                  {item.method}
                  {item.type === "지출" && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                      지출
                    </span>
                  )}
                </div>

                {item.memo && (
                  <div className="mt-2 text-sm text-slate-300">📝 {item.memo}</div>
                )}

                {item.category && (
                  <div className="mt-1 text-sm text-slate-400">📂 {item.category}</div>
                )}

                <div className="mt-1 text-xs text-slate-500">{item.date}</div>
              </div>

              <div className="text-right">
                <div className="text-lg font-black">₩ {money(item.amount)}</div>

                <button
                  onClick={() => onDelete(item.id)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-red-400"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
