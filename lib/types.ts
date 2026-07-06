export type TransactionType = "매출" | "지출";
export type PaymentMethod = "카드" | "현금" | "계좌" | "인건비";
export interface Transaction { id:string; date:string; type:TransactionType; method:PaymentMethod; amount:number; category:string; memo:string; }
export interface Dashboard { date:string; totalSales:number; totalExpense:number; profit:number; cardSales:number; cashSales:number; bankSales:number; laborExpense:number; receivableBalance:number; receivableCount:number; transactionCount:number; }
export interface ExpenseCategory { name:string; active:string; order:number; }
export interface Employee { id:string; name:string; active:string; order:number; }
export interface LaborEntry { id:string; transactionId:string; date:string; employee:string; tableNo:string; tc:number; amount:number; memo:string; }
export interface LaborSummaryByEmployee { employee:string; tc:number; amount:number; }
export interface MonthlySummary extends Dashboard { month:string; }
export interface DailySales { date:string; sales:number; }
export type ReceivableStatus = "미수" | "일부입금" | "완납";
export interface Receivable { id:string; date:string; name:string; phone:string; amount:number; paid:number; balance:number; status:ReceivableStatus; memo:string; }
export interface ReceivableSummary { totalAmount:number; totalPaid:number; totalBalance:number; openCount:number; closedCount:number; }
