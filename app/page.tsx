
"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [date, setDate] = useState("2026-07-08");

  const [data, setData] = useState({
    profit: 10000,
    sales: 10000,
    card: 10000,
    cash: 0,
    bank: 0,
    expense: 0,
  });

  useEffect(() => {
    // TODO: API 연결
  }, [date]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#0B1220]">

      <div className="w-full max-w-md px-4 pt-6">

        <div className="text-center text-2xl font-bold">
          🎬 드라마 LIVE
        </div>

        <div className="flex items-center justify-between bg-[#111A2E] p-3 rounded-xl mt-4">
          <button>‹</button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-white text-center"
          />

          <button>›</button>
        </div>

        <div className="mt-4 bg-green-500 rounded-xl p-5">
          <div className="text-sm">오늘 순이익</div>
          <div className="text-2xl font-bold">
            ₩ {data.profit.toLocaleString()}
          </div>
        </div>

        <div className="mt-3 bg-[#111A2E] p-4 rounded-xl">
          총매출 ₩ {data.sales.toLocaleString()}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">

          <div className="bg-[#111A2E] p-3 rounded-xl">
            카드 ₩ {data.card.toLocaleString()}
          </div>

          <div className="bg-[#111A2E] p-3 rounded-xl">
            현금 ₩ {data.cash.toLocaleString()}
          </div>

          <div className="bg-[#111A2E] p-3 rounded-xl">
            계좌 ₩ {data.bank.toLocaleString()}
          </div>

          <div className="bg-[#111A2E] p-3 rounded-xl">
            지출 ₩ {data.expense.toLocaleString()}
          </div>

        </div>

      </div>

      {/* FLOAT BUTTON */}
      <button className="fixed bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white text-black text-3xl shadow-lg">
        +
      </button>

    </div>
  );
}
