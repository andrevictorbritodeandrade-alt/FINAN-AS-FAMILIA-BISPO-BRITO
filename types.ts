
export type TransactionType = 'incomes' | 'expenses' | 'shoppingItems' | 'avulsosItems';

export interface InstallmentInfo {
  current: number;
  total: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  paid: boolean;
  date?: string;
  dueDate?: string;
  installments?: InstallmentInfo;
  group?: string; // New field for grouping (Fixed vs Variable)
  paidAt?: string;
  isDistribution?: boolean; // Flag to identify surplus allocation items
  isSuspended?: boolean; // New field to suspend a transaction
  suspendedUntil?: string; // Month to resume (e.g. "2026-06")
  skipped?: boolean; // Transaction locked/skipped this month
  updatedAt?: number;
}

export interface Goal {
  id: string;
  category: string;
  amount: number;
  name?: string;
  linkedTransactionId?: string; // ID of the transaction that funds this goal
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
}

export interface DebtSettlement {
  id: string;
  description: string;
  amount: number;
  priority: number;
  isPaid: boolean;
  notes?: string;
  targetMonth?: string; // Goal month to pay this off
}

export interface MonthData {
  incomes: Transaction[];
  expenses: Transaction[];
  shoppingItems: Transaction[];
  avulsosItems: Transaction[];
  goals: Goal[];
  bankAccounts: BankAccount[];
  bankReserves?: { santander: number; inter: number; sofisa: number };
  checkIn?: { isDone: boolean; date: string | null };
  debtSettlements?: DebtSettlement[]; // New field for at-sight debt planning
  updatedAt: number;
}

export interface FinancialProjection {
  month: string;
  year: number;
  fixedIncome: number;
  recurringExpenses: number;
  committedInstallments: number;
  totalCommitted: number;
  margin: number;
  details: string[];
}