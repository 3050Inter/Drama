"use client";
import { CreditCard, Landmark, Pencil, Trash2, Wallet } from "lucide-react";
import { formatWon } from "@/lib/formatter";
import type { Transaction } from "@/lib/types";

export default function TransactionCard({ item, onEdit, onDelete }: { item: Transaction; onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void }) {
  const icon = item.method === "카드" ? <CreditCard size={20}/> : item.method === "현금" ? <Wallet size={20}/> : <Landmark size={20}/>;
  return <div className="transaction-card">
    <div className="transaction-top"><div className="transaction-method">{icon}{item.method} {item.type === "지출" ? "· 지출" : ""}</div><div className="transaction-amount">{formatWon(item.amount)}</div></div>
    {item.category && <div className="transaction-meta">📂 {item.category}</div>}
    {item.memo && <div className="transaction-meta">📝 {item.memo}</div>}
    <div className="transaction-meta">📅 {item.date}</div>
    <div className="transaction-actions"><button className="edit-btn" onClick={()=>onEdit(item)}><Pencil size={17}/>수정</button><button className="delete-btn" onClick={()=>onDelete(item)}><Trash2 size={17}/>삭제</button></div>
  </div>;
}
