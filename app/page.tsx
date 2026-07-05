"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [date, setDate] = useState("2026-07-08");

  const [summary, setSummary] = useState({
    sales: 0,
    expense: 0,
    profit: 0,
  });

  // 더미 로드 (나중에 API 연결)
  const loadSummary = async () => {
    setSummary({
      sales: 10000,
      expense: 0,
      profit: 10000,
    });
  };

  useEffect(() => {
    loadSummary();
  }, [date]);

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex flex-col items-center">

      {/* HEADER */}
      <div className="w-full max-w-md px-4 pt-6">

        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="text-2xl">🎬</div>
          <h1 className="text-xl font-bold">드라마 LIVE</h1>
        </div>

        {/* 삭제된 문구 없음 */}

        {/* DATE */}
        <div className="flex items-center justify-between bg-[#111A2E] rounded-xl p-3 mt-3">
          <button>‹</button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-center"
          />

          <button>›</button>
        </div>
      </div>

      {/* BODY */}
      <div className="w-full max-w-md px-4 mt-4 space-y-3">

        {/* PROFIT */}
        <div className="bg-green-500 rounded-xl p-5">
          <div className="text-sm">오늘 순이익</div>
          <div className="text-2xl font-bold">
            ₩ {summary.profit.toLocaleString()}
          </div>
        </div>

        {/* SALES */}
        <div className="bg-[#111A2E] rounded-xl p-4">
          총매출 ₩ {summary.sales.toLocaleString()}
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 gap-3">

          <div className="bg-[#111A2E] p-3 rounded-xl">
            카드 ₩ 10,000
          </div>

          <div className="bg-[#111A2E] p-3 rounded-xl">
            현금 ₩ 0
          </div>

          <div className="bg-[#111A2E] p-3 rounded-xl">
            계좌 ₩ 0
          </div>

          <div className="bg-[#111A2E] p-3 rounded-xl">
            총지출 ₩ {summary.expense.toLocaleString()}
          </div>

        </div>

      </div>

      {/* FLOAT BUTTON (정리됨) */}
      <button
        className="
          fixed bottom-6 left-1/2 -translate-x-1/2
          w-14 h-14 rounded-full bg-white text-black
          shadow-md flex items-center justify-center text-2xl
        "
      >
        +
      </button>

    </div>
  );
}
