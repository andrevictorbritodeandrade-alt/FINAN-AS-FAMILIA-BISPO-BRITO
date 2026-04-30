export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  paid: boolean;
  dueDate: string;
  date?: string;
  type?: 'income' | 'expense';
  installments?: {
    current: number;
    total: number;
  };
  group?: string;
}

export interface BankReserves {
  santander: number;
  inter: number;
  sofisa: number;
}

export interface MonthData {
  income: Transaction[];
  expenses: Transaction[];
  avulsosItems: Transaction[];
}
