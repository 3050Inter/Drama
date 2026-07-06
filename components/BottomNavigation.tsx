"use client";

import { Home, BarChart3, Settings, Plus } from "lucide-react";

interface Props {
  onAdd: () => void;
}

export default function BottomNavigation({ onAdd }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
      <div className="relative h-20 w-full max-w-md border-t border-slate-800 bg-[#0B1220]/95 backdrop-blur">
        <div className="flex h-full items-center justify-around px-6 text-xs text-slate-400">
          <button className="flex flex-col items-center gap-1 text-green-400">
            <Home size={22} />
            홈
          </button>

          <div className="w-16" />

          <button className="flex flex-col items-center gap-1">
            <BarChart3 size={22} />
            월별
          </button>

          <button className="flex flex-col items-center gap-1">
            <Settings size={22} />
            설정
          </button>
        </div>

        <button
          onClick={onAdd}
          className="absolute -top-7 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-xl transition active:scale-95"
        >
          <Plus size={34} />
        </button>
      </div>
    </div>
  );
}
