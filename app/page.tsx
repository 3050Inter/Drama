"use client";

import { useState } from "react";

export default function Page() {
  const [date, setDate] = useState("2026-07-06");

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex flex-col items-center">

      {/* HEADER */}
      <div className="w-full max-w-md pt-6 px-4">

        <div className="flex items-center justify-center gap-2 mb-2">

          {/* 🎬 아이콘 변경 */}
          <div className="text-2xl">🎬</div>

          {/* TITLE 변경 */}
          <h1 className="text-xl font-bold">
            드라마 LIVE
          </h1>
        </div>

        <p className="text-center text-xs text-gray-400 mb-4">
          7080 라이브 가계부
        </p>

        {/* 날짜 */}
        <div className="flex items-center justify-between bg-[#111A2E] rounded-xl p-3">
          <button className="px-3">‹ 이전</button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-center"
          />

          <button className="px-3">다음 ›</button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="w-full max-w-md px-4 mt-4 space-y-3">

        <div className="bg-green-500 rounded-xl p-5">
          <div className="text-sm">오늘 순이익</div>
          <div className="text-2xl font-bold">₩ 10,000</div>
        </div>

        <div className="bg-[#111A2E] rounded-xl p-4">
          총매출 ₩ 10,000
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111A2E] p-3 rounded-xl">카드 ₩ 10,000</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">현금 ₩ 0</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">계좌 ₩ 0</div>
          <div className="bg-[#111A2E] p-3 rounded-xl">총지출 ₩ 0</div>
        </div>

      </div>

      {/* ❌ 영업마감 문구 완전 삭제 */}

      {/* FLOAT BUTTON (수정) */}
      <button className="fixed bottom-6 left-1/2 -translate-x-1/2
                         w-14 h-14 rounded-full bg-white text-black
                         shadow-md flex items-center justify-center text-2xl">
        +
      </button>

    </div>
  );
}
