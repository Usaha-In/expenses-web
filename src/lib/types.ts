export type TransactionType = "expense" | "income";

export interface WebAccount {
  id: number;
  label: string;
  kind: "personal" | "group";
}

export interface SessionInfo {
  user: { id: number; username: string };
  accounts: WebAccount[];
  csrfToken: string;
  expiresAt: string;
}

export interface ExpenseItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
  category: string;
}

export interface Expense {
  id: number;
  username: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  type: TransactionType;
  walletName?: string;
  transactionDate: string;
  items?: ExpenseItem[];
}

export interface ExpenseList {
  data: Expense[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CategorySummary {
  category: string;
  currency: string;
  totalAmount: number;
  count: number;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  transactionCount: number;
  byCategory: CategorySummary[];
}

export interface DailyTotal {
  date: string;
  totalIncome: number;
  totalExpense: number;
  count: number;
}

export type Period = "daily" | "weekly" | "monthly";

export interface Dashboard {
  period: Period;
  periodLabel: string;
  startDate: string;
  endDate: string;
  currency: string;
  summary: Summary;
  daily: DailyTotal[];
  recent: Expense[];
}

export interface Wallet {
  id: number;
  name: string;
  isMain: boolean;
  currency: string;
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  transactionCount: number;
}

export interface CategoryUsage {
  category: string;
  count: number;
}
