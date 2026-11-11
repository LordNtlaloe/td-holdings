"use client";

import { Fragment, useMemo } from "react";
import { endOfWeek, format, max, min, startOfDay, startOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime } from "@/components/reports/report-utils";
import { WEEK_OPTIONS, type Period } from "#/lib/period-utils";

interface ExpensesTableProps {
  expenses: any[];
  /** Day → flat list. Week → grouped by day. Month → grouped by week. */
  period?: Period;
  /** Range being shown (ms timestamps); used to clip week labels at month edges. */
  range?: { from: number; to: number };
  onDelete?: (expense: any) => void;
  className?: string;
}

interface ExpenseGroup {
  key: number;
  label: string;
  items: any[];
  total: number;
}

function buildGroups(
  expenses: any[],
  period: Period,
  range?: { from: number; to: number }
): ExpenseGroup[] {
  const groups = new Map<number, ExpenseGroup>();

  for (const expense of expenses) {
    const when = new Date(expense.date);
    const start = period === "week" ? startOfDay(when) : startOfWeek(when, WEEK_OPTIONS);
    const key = start.getTime();

    let group = groups.get(key);
    if (!group) {
      let label: string;
      if (period === "week") {
        label = format(start, "EEEE d MMM");
      } else {
        const first = range ? max([start, new Date(range.from)]) : start;
        const last = range
          ? min([endOfWeek(start, WEEK_OPTIONS), new Date(range.to)])
          : endOfWeek(start, WEEK_OPTIONS);
        label =
          format(first, "d MMM") === format(last, "d MMM")
            ? format(first, "d MMM")
            : `${format(first, "d MMM")} – ${format(last, "d MMM")}`;
      }
      group = { key, label, items: [], total: 0 };
      groups.set(key, group);
    }
    group.items.push(expense);
    group.total += expense.amount;
  }

  // Newest first, matching the order the API returns the rows in.
  return [...groups.values()].sort((a, b) => b.key - a.key);
}

export function ExpensesTable({
  expenses,
  period = "day",
  range,
  onDelete,
  className,
}: ExpensesTableProps) {
  const grouped = period !== "day";
  const groups = useMemo(
    () => (grouped ? buildGroups(expenses, period, range) : []),
    [expenses, period, range, grouped]
  );

  const columnCount = onDelete ? 6 : 5;
  const title =
    period === "day"
      ? "Recorded Expenses"
      : period === "week"
        ? "Expenses by Day"
        : "Expenses by Week";

  const renderRow = (expense: any) => (
    <TableRow key={expense.id}>
      <TableCell>
        {period === "month"
          ? format(new Date(expense.date), "EEE d MMM")
          : formatDateTime(expense.createdAt)}
      </TableCell>
      <TableCell>{expense.storeName || "Unknown"}</TableCell>
      <TableCell>{expense.category}</TableCell>
      <TableCell className="max-w-64 truncate text-muted-foreground">
        {expense.description || "—"}
      </TableCell>
      <TableCell className="text-right font-medium text-destructive">
        {formatCurrency(expense.amount)}
      </TableCell>
      {onDelete && (
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${expense.category} expense`}
            onClick={() => onDelete(expense)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{period === "month" ? "Date" : "Recorded"}</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {onDelete && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-8 text-center text-muted-foreground"
                >
                  No expenses recorded for this {period}
                </TableCell>
              </TableRow>
            ) : grouped ? (
              groups.map((group) => (
                <Fragment key={group.key}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={4} className="font-medium">
                      {group.label}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {group.items.length} {group.items.length === 1 ? "item" : "items"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(group.total)}
                    </TableCell>
                    {onDelete && <TableCell />}
                  </TableRow>
                  {group.items.map(renderRow)}
                </Fragment>
              ))
            ) : (
              expenses.map(renderRow)
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}