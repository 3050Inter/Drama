"use client";
import type { Transaction } from "@/lib/types";
import TransactionCard from "./TransactionCard";

export default function TransactionList({ items, onEdit, onDelete }: { items: Transaction[]; onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void }) {
  if (!items.length) return <div className="empty-box">거래내역이 없습니다.</div>;
  return <div className="transaction-list">{items.map((item)=><TransactionCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete}/>)}</div>;
}
