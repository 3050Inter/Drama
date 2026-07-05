
"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [date, setDate] = useState("2026-07-08");
  const [open, setOpen] = useState(false);

  const [summary, setSummary] = useState({
    sales: 10000,
    expense: 0,
    profit: 10000,
  });

  const [list, setList] = useState([
    { id: "1", type: "매출", method: "카드", amount: 10000, memo: "테스트" }
  ]);

  const reload = async () => {
    setSummary({
      sales: 10000,
      expense: 0,
      profit: 10000,
    });
  };

  useEffect(() => {
    reload();
  }, [date]);

  const remove = (id) => {
    setList(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#0B1220]">

      <div className="w-full max-w-md p-4">

        <div className="text-center text-2xl font-bold">
          🎬 드라마 LIVE
        </div>

        <div className="mt-4 flex justify-between bg-[#111A2E] p-3 rounded-xl">
          <button>‹</button>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <button>›</button>
        </div>

        <div className="mt-4 bg-green-500 p-5 rounded-xl">
          오늘 순이익: ₩{summary.profit}
        </div>

        <div className="mt-2 bg-[#111A2E] p-3 rounded-xl">
          총매출: ₩{summary.sales}
        </div>

        <div className="mt-4 space-y-2">

          {list.map(item => (
            <div key={item.id} className="bg-[#111A2E] p-3 rounded-xl flex justify-between">
              <div>
                <div>{item.method}</div>
                <div className="text-xs text-gray-400">{item.memo}</div>
              </div>

              <div className="text-right">
                <div>₩{item.amount}</div>
                <button className="text-red-400 text-xs" onClick={()=>remove(item.id)}>삭제</button>
              </div>
            </div>
          ))}

        </div>

      </div>

      <button
        onClick={()=>setOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-green-500 text-3xl"
      >
        +
      </button>

    </div>
  );
}
