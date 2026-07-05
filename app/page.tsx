"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import BottomSheet from "@/components/BottomSheet";
import Dashboard from "@/components/Dashboard";
import DateNavigator from "@/components/DateNavigator";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";
import { deleteTransaction, getDashboard, getMonthly, getTransactions } from "@/lib/api";
import { formatWon, getMonthString, nextDate, previousDate, todayString } from "@/lib/formatter";
import type { Dashboard as DashboardType, MonthlySummary, PageMode, PaymentMethod, Transaction } from "@/lib/types";

export default function Home() {
  const [page, setPage] = useState<PageMode>("home");
  const [date, setDate] = useState(todayString());
  const [dashboard, setDashboard] = useState<DashboardType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<PaymentMethod | "지출" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummary | null>(null);
  const [monthlyRows, setMonthlyRows] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(getMonthString(todayString()));
  const [loading, setLoading] = useState(false);

  async function reloadDay(target = date) {
    setLoading(true);
    try {
      const [dash, tx] = await Promise.all([getDashboard(target), getTransactions(target)]);
      if (dash.ok) setDashboard(dash.dashboard);
      if (tx.ok) setTransactions(tx.rows);
    } finally {
      setLoading(false);
    }
  }

  async function reloadMonth(target = month) {
    const res = await getMonthly(target);
    if (res.ok) {
      setMonthly(res.monthly);
      setMonthlyRows(res.rows);
    }
  }

  useEffect(() => {
    reloadDay(date);
  }, [date]);

  useEffect(() => {
    if (page === "monthly") reloadMonth(month);
  }, [page, month]);

  const shownTransactions = useMemo(() => {
    if (!filter) return transactions;
    if (filter === "지출") return transactions.filter((t) => t.type === "지출");
    return transactions.filter((t) => t.method === filter && t.type === "매출");
  }, [transactions, filter]);

  function openInput() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(item: Transaction) {
    setEditing(item);
    setSheetOpen(true);
  }

  async function afterSave() {
    setSheetOpen(false);
    setEditing(null);
    await reloadDay(date);
    if (page === "monthly") await reloadMonth(month);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteTransaction(deleting.id);
    if (!result.ok) {
      alert(result.error || "삭제 실패");
      return;
    }
    setDeleting(null);
    await reloadDay(date);
    if (page === "monthly") await reloadMonth(month);
  }

  return (
    <main className="app">
      <h1 className="top-title">🎭 드라마 가계부</h1>
      <p className="sub">7080 라이브 마감 정산</p>

      {page === "home" && (
        <>
          <DateNavigator
            date={date}
            onPrev={() => setDate(previousDate(date))}
            onNext={() => setDate(nextDate(date))}
            onChange={setDate}
          />

          <Dashboard dashboard={dashboard} onFilter={(value) => setFilter(value)} />

          <div className="section-title">
            <h2>🧾 거래내역 {filter ? `· ${filter}` : ""}</h2>
            {filter && <button className="cancel-btn" onClick={() => setFilter(null)}>전체보기</button>}
          </div>
          {loading ? <div className="empty-box">불러오는 중...</div> : <TransactionList items={shownTransactions} onEdit={openEdit} onDelete={setDeleting} />}
        </>
      )}

      {page === "monthly" && (
        <>
          <div className="section-title"><h2>📊 월별 조회</h2></div>
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          {monthly && <div className="monthly-card">
            <p>💚 순이익</p><h2>{formatWon(monthly.profit)}</h2>
            <p>💰 총매출 {formatWon(monthly.totalSales)}</p>
            <p>💸 총지출 {formatWon(monthly.totalExpense)}</p>
            <p>💳 카드 {formatWon(monthly.cardSales)}</p>
            <p>💵 현금 {formatWon(monthly.cashSales)}</p>
            <p>🏦 계좌 {formatWon(monthly.bankSales)}</p>
          </div>}
          <div className="section-title"><h2>월 거래내역</h2></div>
          <TransactionList items={monthlyRows} onEdit={openEdit} onDelete={setDeleting} />
        </>
      )}

      {page === "settings" && (
        <>
          <div className="section-title"><h2>⚙️ 설정</h2></div>
          <div className="settings-card">
            <h3>드라마 가계부 V1.0.0</h3>
            <p className="sub">로그인 없이 여자친구 혼자 사용하는 마감 정산 앱입니다.</p>
            <p className="sub">지출항목은 Google Sheets의 지출항목 탭에서 관리합니다.</p>
          </div>
        </>
      )}

      <BottomNavigation page={page} onChange={setPage} onInput={openInput} />

      <BottomSheet open={sheetOpen} onClose={() => { setSheetOpen(false); setEditing(null); }}>
        <TransactionForm date={date} editing={editing} onDone={afterSave} />
      </BottomSheet>

      <BottomSheet open={!!deleting} onClose={() => setDeleting(null)}>
        <div className="confirm-box">
          <h2>삭제하시겠습니까?</h2>
          <p className="sub">{deleting ? `${deleting.method} ${formatWon(deleting.amount)}` : ""}</p>
          <div className="confirm-actions">
            <button className="cancel-btn" onClick={() => setDeleting(null)}>취소</button>
            <button className="delete-btn" onClick={confirmDelete}>삭제</button>
          </div>
        </div>
      </BottomSheet>
    </main>
  );
}
