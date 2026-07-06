"use client";

import { useEffect, useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import Dashboard from "@/components/Dashboard";
import DateNavigator from "@/components/DateNavigator";
import InputSheet from "@/components/InputSheet";
import TransactionList from "@/components/TransactionList";
import { addTransaction, deleteTransaction, getDashboard, getTransactions } from "@/lib/api";
import { todayString } from "@/lib/formatter";
import type { Dashboard as DashboardType, Transaction } from "@/lib/types";

const EMPTY_DASHBOARD: DashboardType = {
  date: todayString(),
  totalSales: 0,
  totalExpense: 0,
  profit: 0,
  cardSales: 0,
  cashSales: 0,
  bankSales: 0,
  transactionCount: 0,
};

export default function Page() {
  const [date, setDate] = useState(todayString());
  const [dashboard, setDashboard] = useState<DashboardType>(EMPTY_DASHBOARD);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [open, setOpen] = useState(false);
  const [apiReady, setApiReady] = useState(true);

  const reload = async () => {
    try {
      const [dashboardRes, transactionsRes] = await Promise.all([
        getDashboard(date),
        getTransactions(date),
      ]);

      if (dashboardRes.ok) {
        setDashboard(dashboardRes.dashboard);
      }

      if (transactionsRes.ok) {
        setTransactions(transactionsRes.rows || []);
      }

      setApiReady(true);
    } catch (err) {
      setApiReady(false);
      setDashboard({
        ...EMPTY_DASHBOARD,
        date,
      });
      setTransactions([]);
    }
  };

  useEffect(() => {
    reload();
  }, [date]);

  const saveTransaction = async (data: Parameters<typeof addTransaction>[0]) => {
    await addTransaction(data);
    await reload();
  };

  const removeTransaction = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await deleteTransaction(id);
    await reload();
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-6">
        <h1 className="text-center text-2xl font-black">🎬 드라마 LIVE</h1>

        <DateNavigator date={date} onChange={setDate} />

        {!apiReady && (
          <div className="mt-3 rounded-xl bg-yellow-500/15 p-3 text-sm text-yellow-200">
            API URL이 아직 연결되지 않았습니다. `lib/api.ts`의 API_URL을 입력하면 실제 데이터가 표시됩니다.
          </div>
        )}

        <Dashboard data={dashboard} />

        <div className="mt-5 flex items-center gap-2 text-lg font-black">
          🧾 거래내역
        </div>

        <TransactionList items={transactions} onDelete={removeTransaction} />
      </main>

      <BottomNavigation onAdd={() => setOpen(true)} />

      <InputSheet
        open={open}
        date={date}
        onClose={() => setOpen(false)}
        onSave={saveTransaction}
      />
    </div>
  );
}
