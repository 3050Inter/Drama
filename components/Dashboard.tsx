"use client";
import { CreditCard, Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Dashboard as DashboardType, PaymentMethod } from "@/lib/types";
import { formatWon } from "@/lib/formatter";
import StatCard from "./StatCard";

export default function Dashboard({ dashboard, onFilter }: { dashboard: DashboardType | null; onFilter?: (m: PaymentMethod | "지출" | null) => void }) {
  if (!dashboard) return <div className="empty-box">데이터를 불러오는 중입니다.</div>;
  return <section className="dashboard">
    <div className="profit-card"><p>💚 오늘 순이익</p><strong>{formatWon(dashboard.profit)}</strong></div>
    <StatCard icon={<TrendingUp size={20}/>} title="총매출" amount={dashboard.totalSales} color="#22c55e" onClick={()=>onFilter?.(null)}/>
    <div className="grid-2">
      <StatCard icon={<CreditCard size={18}/>} title="카드" amount={dashboard.cardSales} color="#60a5fa" onClick={()=>onFilter?.("카드")}/>
      <StatCard icon={<Wallet size={18}/>} title="현금" amount={dashboard.cashSales} color="#fb923c" onClick={()=>onFilter?.("현금")}/>
    </div>
    <div className="grid-2">
      <StatCard icon={<Landmark size={18}/>} title="계좌" amount={dashboard.bankSales} color="#a78bfa" onClick={()=>onFilter?.("계좌")}/>
      <StatCard icon={<TrendingDown size={18}/>} title="총지출" amount={dashboard.totalExpense} color="#ef4444" onClick={()=>onFilter?.("지출")}/>
    </div>
  </section>;
}
