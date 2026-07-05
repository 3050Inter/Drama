"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [date, setDate] = useState("2026-07-08");

  const [summary, setSummary] = useState({
    sales: 10000,
    expense: 0,
    profit: 10000,
    card: 10000,
    cash: 0,
    bank: 0,
  });

  useEffect(() => {
    // mock fetch
    setSummary(prev => ({ ...prev }));
  }, [date]);

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col items-center">

      <div className="w-full max-w-md p-4">

        <div className="text-center text-2xl font-bold">🎬 드라마 LIVE</div>

        <div className="mt-4 flex justify-between bg-[#111A2E] p-3 rounded-xl">
          <button>‹</button>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <button>›</button>
        </div>

        <div className="mt-4 bg-green-500 p-5 rounded-xl">
          오늘 순이익 ₩ {summary.profit.toLocaleString()}
        </div>

        <div className="mt-2 bg-[#111A2E] p-3 rounded-xl">
          총매출 ₩ {summary.sales.toLocaleString()}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">

          <div className="bg-[#111A2E] p-3 rounded-xl">카드 ₩ {summary.card}</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">현금 ₩ {summary.cash}</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">계좌 ₩ {summary.bank}</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">지출 ₩ {summary.expense}</div>

        </div>

      </div>

      <button className="fixed bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white text-black text-3xl">
        +
      </button>

    </div>
  );
}
