"use client";
import { useEffect, useState } from "react";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { addTransaction, updateTransaction } from "@/lib/api";
import { formatMoney, todayString } from "@/lib/formatter";
import type { PaymentMethod, Transaction, TransactionType } from "@/lib/types";

export default function TransactionForm({ date, editing, onDone }: { date: string; editing?: Transaction | null; onDone: () => void }) {
  const [formDate, setFormDate] = useState(date || todayString());
  const [type, setType] = useState<TransactionType>("매출");
  const [method, setMethod] = useState<PaymentMethod>("카드");
  const [category, setCategory] = useState("주류매입");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (editing) {
      setFormDate(editing.date);
      setType(editing.type);
      setMethod(editing.method);
      setCategory(editing.category || "주류매입");
      setAmount(String(editing.amount || ""));
      setMemo(editing.memo || "");
    } else {
      setFormDate(date || todayString());
      setType("매출");
      setMethod("카드");
      setCategory("주류매입");
      setAmount("");
      setMemo("");
    }
  }, [editing, date]);

  function changeType(next: TransactionType) {
    setType(next);
    if (next === "매출") setCategory("");
    if (next === "지출" && !category) setCategory("주류매입");
  }

  function handleAmount(value: string) {
    setAmount(value.replace(/[^0-9]/g, ""));
  }

  async function save() {
    const money = Number(amount);
    if (!money || money <= 0) {
      setToast("금액을 입력하세요");
      setTimeout(() => setToast(""), 1200);
      return;
    }
    try {
      setSaving(true);
      const data = { date: formDate, type, method, amount: money, category: type === "지출" ? category : "", memo };
      const result = editing ? await updateTransaction(editing.id, data) : await addTransaction(data);
      if (!result.ok) {
        setToast(result.error || "저장 실패");
        setTimeout(() => setToast(""), 1200);
        return;
      }
      onDone();
    } catch (e) {
      console.error(e);
      setToast("서버 연결 실패");
      setTimeout(() => setToast(""), 1200);
    } finally {
      setSaving(false);
    }
  }

  return <div className="quick-form">
    <h2>{editing ? "거래 수정" : "빠른 입력"}</h2>
    <p className="sub">날짜, 금액, 결제수단을 입력하세요.</p>
    <label className="field-label">📅 날짜</label>
    <input className="input" type="date" value={formDate} onChange={(e)=>setFormDate(e.target.value)}/>
    <div className="toggle-row">
      <button className={type === "매출" ? "toggle-btn active sales" : "toggle-btn"} onClick={()=>changeType("매출")}>💰 매출</button>
      <button className={type === "지출" ? "toggle-btn active expense" : "toggle-btn"} onClick={()=>changeType("지출")}>💸 지출</button>
    </div>
    <label className="field-label">💵 금액</label>
    <input className="money-input" type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0" value={amount ? formatMoney(Number(amount)) : ""} onChange={(e)=>handleAmount(e.target.value)}/>
    {type === "지출" && <><label className="field-label">📂 지출항목</label><div className="category-grid">{EXPENSE_CATEGORIES.map((c)=><button key={c} className={category === c ? "chip active" : "chip"} onClick={()=>setCategory(c)}>{c}</button>)}</div></>}
    <label className="field-label">결제수단</label>
    <div className="method-grid">{PAYMENT_METHODS.map((m)=><button key={m} className={`method-btn ${m === "카드" ? "card" : m === "현금" ? "cash" : "bank"}`} onClick={()=>setMethod(m)} style={{ outline: method === m ? "3px solid white" : "none" }}>{m === "카드" ? "💳" : m === "현금" ? "💵" : "🏦"} {m}</button>)}</div>
    <label className="field-label">📝 메모</label>
    <input className="memo-input" value={memo} onChange={(e)=>setMemo(e.target.value)} placeholder="메모" />
    <button className="save-btn" onClick={save} disabled={saving}>{saving ? "저장 중..." : "💾 저장"}</button>
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
