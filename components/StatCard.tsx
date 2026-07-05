"use client";
import type { ReactNode } from "react";
import { formatWon } from "@/lib/formatter";

export default function StatCard({ icon, title, amount, color, onClick }: { icon: ReactNode; title: string; amount: number; color?: string; onClick?: () => void }) {
  return <button className="stat-card" onClick={onClick}>
    <div className="label"><span>{icon}</span><span>{title}</span></div>
    <strong style={{ color }}>{formatWon(amount)}</strong>
  </button>;
}
