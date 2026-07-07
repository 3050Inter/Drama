export type TransactionType = "매출" | "지출";
export type PaymentMethod = "카드" | "현금" | "계좌" | "인건비";
export type PageKey = "home" | "stats" | "personal" | "labor" | "receivable" | "settings";
export type OwnerName = "연주" | "관수";

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  category: string;
  memo: string;
}

export interface Dashboard {
  date: string;
  totalSales: number;
  totalExpense: number;
  profit: number;
  cardSales: number;
  cashSales: number;
  bankSales: number;
  cumulativeCash: number;
  laborExpense: number;
  receivableBalance: number;
  receivableCount: number;
  transactionCount: number;
}

export interface ExpenseCategory { name: string; active: string; order: number; }
export interface Employee { id: string; name: string; active: string; order: number; }
export interface LaborEntry { id: string; transactionId: string; date: string; employee: string; tableNo: string; tc: number; dailyPay?: number; amount?: number; memo: string; }
export interface LaborSummaryByEmployee { employee: string; tc: number; dailyPay?: number; amount?: number; }

export interface ReceivablePayment {
  id: string;
  date: string;
  receivableId: string;
  name: string;
  status: "일부입금" | "완납" | string;
  method: PaymentMethod;
  amount: number;
  balance: number;
  memo: string;
  transactionId?: string;
}

export interface Receivable {
  id: string;
  date: string;
  name: string;
  phone: string;
  amount: number;
  paid: number;
  balance: number;
  status: "미수" | "일부입금" | "완납";
  memo: string;
  payments?: ReceivablePayment[];
}

export interface ReceivableSummary { totalBalance: number; count: number; paidTotal: number; }

export interface PersonalExpense {
  id: string;
  date: string;
  owner: OwnerName;
  method: PaymentMethod;
  amount: number;
  memo: string;
}

export interface PersonalExpenseSummary {
  total: number;
  yeonju: number;
  gwansu: number;
}

export interface StatsSummary extends Dashboard {
  startDate: string;
  endDate: string;
  personal: PersonalExpenseSummary;
  rows: Transaction[];
  personalRows: PersonalExpense[];
}

export interface MonthlySummary extends Dashboard { month: string; }
export interface DailySales { date: string; sales: number; }
