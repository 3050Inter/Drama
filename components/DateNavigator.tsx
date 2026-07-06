"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "@/lib/formatter";

interface Props {
  date: string;
  onChange: (date: string) => void;
}

export default function DateNavigator({ date, onChange }: Props) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="flex h-12 w-16 items-center justify-center rounded-xl bg-[#111A2E]"
      >
        <ChevronLeft size={22} />
      </button>

      <label className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#111A2E] px-3 font-bold">
        <CalendarDays size={17} className="text-slate-300" />
        <input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-center text-white outline-none"
        />
      </label>

      <button
        onClick={() => onChange(addDays(date, 1))}
        className="flex h-12 w-16 items-center justify-center rounded-xl bg-[#111A2E]"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
