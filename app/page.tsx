"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [date, setDate] = useState("2026-07-08");

  const [summary, setSummary] = useState({
    sales: 0,
    expense: 0,
    profit: 0,
  });

  const [transactions, setTransactions] = useState([]);

  /* -------------------------
     LOAD DASHBOARD (MOCK or API)
  --------------------------*/
  const loadDashboard = async () => {
    setSummary({
      sales: 10000,
      expense: 0,
      profit: 10000,
    });
  };

  /* -------------------------
     LOAD TRANSACTIONS (MOCK)
  --------------------------*/
  const loadTransactions = async () => {
    setTransactions([
      {
        id: "1",
        type: "매출",
        method: "카드",
        amount: 10000,
        memo: "테스트",
      },
    ]);
  };

  useEffect(() => {
    loadDashboard();
    loadTransactions();
  }, [date]);

  /* -------------------------
     DELETE
  --------------------------*/
  const handleDelete = async (id: string) => {
    setTransactions((prev) => prev.filter((t: any) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex flex-col items-center">

      {/* HEADER */}
      <div className="w-full max-w-md px-4 pt-6">

        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="text-2xl">🎬</div>
          <h1 className="text-xl font-bold">
            드라마 <span className="text-green-400">LIVE</span>
          </h1>
        </div>

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

      {/* SUMMARY */}
      <div className="w-full max-w-md px-4 mt-4 space-y-3">

        <div className="bg-green-500 rounded-xl p-5">
          <div className="text-sm">오늘 순이익</div>
          <div className="text-2xl font-bold">
            ₩ {summary.profit.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#111A2E] rounded-xl p-4">
          총매출 ₩ {summary.sales.toLocaleString()}
        </div>

        <div className="grid grid-cols-2 gap-3">

          <div className="bg-[#111A2E] p-3 rounded-xl">카드 ₩ 10,000</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">현금 ₩ 0</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">계좌 ₩ 0</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">
            총지출 ₩ {summary.expense.toLocaleString()}
          </div>

        </div>
      </div>

      {/* LIST */}
      <div className="w-full max-w-md px-4 mt-4 space-y-2">

        {transactions.map((t: any) => (
          <div
            key={t.id}
            className="bg-[#111A2E] p-4 rounded-xl flex justify-between items-center"
          >
            <div>
              <div className="font-bold">{t.method}</div>
              <div className="text-xs text-gray-400">{t.memo}</div>
            </div>

            <div className="text-right">
              <div className="font-bold">₩ {t.amount}</div>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-red-400 text-xs"
              >
                삭제
              </button>
            </div>
          </div>
        ))}

      </div>

      {/* FLOAT BUTTON */}
      <button
        className="
          fixed bottom-8 left-1/2 -translate-x-1/2
          w-16 h-16 rounded-full
          bg-gradient-to-br from-green-400 to-green-600
          text-white text-3xl
          shadow-xl flex items-center justify-center
          active:scale-95 transition
        "
      >
        +
      </button>

    </div>
  );
}
