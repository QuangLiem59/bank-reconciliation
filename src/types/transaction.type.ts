export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  type?: 'Deposit' | 'Withdraw';
  minAmount?: number;
  maxAmount?: number;
  content?: string;
}

export const TRANSACTION_TYPES = {
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdraw',
} as const;
