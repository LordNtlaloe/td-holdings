export interface SummaryBucket {
    from: number;
    to: number;
    sales: number;
    expenses: number;
}

export interface Summary {
    from: number;
    to: number;
    totals: { sales: number; expenses: number };
    series: SummaryBucket[];
    categories: { category: string; amount: number }[];
}

export interface ExpenseRecord {
    id: string;
    storeName: string;
    category: string;
    description: string | null;
    amount: number;
    /** The day the expense belongs to (noon, local time of whoever recorded it). */
    date: number;
    /** When the record was created. */
    createdAt: number;
}