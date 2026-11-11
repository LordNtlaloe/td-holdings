"use client";

import { useMemo } from "react";
import { eachDayOfInterval, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/components/reports/report-utils";

interface DailySummaryTableProps {
  sales: { createdAt: number; totalAmount: number }[];
  expenses: { date: number; amount: number }[];
  /** Range being shown (ms timestamps). Days after today are left out. */
  range: { from: number; to: number };
  className?: string;
}

const dayKey = (ts: number) => format(new Date(ts), "yyyy-MM-dd");

export function DailySummaryTable({ sales, expenses, range, className }: DailySummaryTableProps) {
  const { rows, totalSales, totalExpenses } = useMemo(() => {
    const salesByDay = new Map<string, number>();
    for (const s of sales) {
      const key = dayKey(s.createdAt);
      salesByDay.set(key, (salesByDay.get(key) ?? 0) + s.totalAmount);
    }
    const expensesByDay = new Map<string, number>();
    for (const e of expenses) {
      const key = dayKey(e.date);
      expensesByDay.set(key, (expensesByDay.get(key) ?? 0) + e.amount);
    }

    const end = Math.min(range.to, Date.now());
    const days = end < range.from ? [] : eachDayOfInterval({ start: new Date(range.from), end: new Date(end) });

    const rows = days
      .map((date) => {
        const key = dayKey(date.getTime());
        return {
          key,
          date,
          sales: salesByDay.get(key) ?? 0,
          expenses: expensesByDay.get(key) ?? 0,
        };
      })
      .reverse(); // newest first

    return {
      rows,
      totalSales: rows.reduce((sum, r) => sum + r.sales, 0),
      totalExpenses: rows.reduce((sum, r) => sum + r.expenses, 0),
    };
  }, [sales, expenses, range.from, range.to]);

  const money = (value: number) =>
    value === 0 ? <span className="text-muted-foreground">—</span> : formatCurrency(value);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Sales and Expenses by Day</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  This period hasn't started yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{format(row.date, "EEE d MMM")}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    {money(row.sales)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {money(row.expenses)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(totalSales)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(totalExpenses)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}