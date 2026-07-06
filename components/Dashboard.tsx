"use client";

import type { Dashboard as DashboardType } from "@/lib/types";
import { money } from "@/lib/formatter";

interface Props {
  data: DashboardType;
}

export default function Dashboard({ data }: Props) {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl bg-green-500 p-5 shadow-lg">
        <div className="text-sm font-bold opacity-90">오늘 순이익</div>
        <div className="mt-1 text-3xl font-black">₩ {money(data.profit)}</div>
      </div>

      <div className="rounded-2xl bg-[#111A2E] p-4">
        <div className="text-sm text-slate-300">총매출</div>
        <div className="mt-1 text-xl font-black text-green-400">
          ₩ {money(data.totalSales)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#111A2E] p-4">
          <div className="text-sm text-slate-300">카드</div>
          <div className="mt-1 font-black text-blue-400">
            ₩ {money(data.cardSales)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#111A2E] p-4">
          <div className="text-sm text-slate-300">현금</div>
          <div className="mt-1 font-black text-orange-400">
            ₩ {money(data.cashSales)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#111A2E] p-4">
          <div className="text-sm text-slate-300">계좌</div>
          <div className="mt-1 font-black text-purple-400">
            ₩ {money(data.bankSales)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#111A2E] p-4">
          <div className="text-sm text-slate-300">총지출</div>
          <div className="mt-1 font-black text-red-400">
            ₩ {money(data.totalExpense)}
          </div>
        </div>
      </div>
    </div>
  );
}
