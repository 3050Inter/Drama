export type TransactionType = "매출" | "지출";
export type PaymentMethod = "카드" | "현금" | "계좌";
export type PageMode = "home" | "monthly" | "settings";

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
  transactionCount: number;
}

export interface MonthlySummary {
  month: string;
  totalSales: number;
  totalExpense: number;
  profit: number;
  cardSales: number;
  cashSales: number;
  bankSales: number;
  transactionCount: number;
}

export interface ExpenseCategory {
  name: string;
  active: string;
  order: number;
}
