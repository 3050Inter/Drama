"use client";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export default function DateNavigator({ date, onPrev, onNext, onChange }: { date: string; onPrev: () => void; onNext: () => void; onChange: (v: string) => void }) {
  return <div className="date-nav">
    <button className="date-btn" onClick={onPrev}><ChevronLeft size={22}/> 이전날</button>
    <label className="date-center"><CalendarDays size={20}/><input type="date" value={date} onChange={(e)=>onChange(e.target.value)}/></label>
    <button className="date-btn" onClick={onNext}>다음날 <ChevronRight size={22}/></button>
  </div>;
}
