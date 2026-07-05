"use client";
import { ChartColumn, House, Plus, Settings } from "lucide-react";
import type { PageMode } from "@/lib/types";

export default function BottomNavigation({ page, onChange, onInput }: { page: PageMode; onChange: (p: PageMode) => void; onInput: () => void }) {
  return <nav className="bottom-nav">
    <button className={page === "home" ? "active" : ""} onClick={()=>onChange("home")}><House size={22}/>홈</button>
    <button className="fab" onClick={onInput}><Plus size={34}/></button>
    <button className={page === "monthly" ? "active" : ""} onClick={()=>onChange("monthly")}><ChartColumn size={22}/>월별</button>
    <button className={page === "settings" ? "active" : ""} onClick={()=>onChange("settings")}><Settings size={22}/>설정</button>
  </nav>;
}
