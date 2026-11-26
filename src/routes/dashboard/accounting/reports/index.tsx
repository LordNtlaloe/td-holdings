import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AppLayout from "#/layouts/app-layout";
import { useTrialBalance, useBalanceSheet, useProfitLoss } from "#/lib/api/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/accounting/reports/")({
  component: ReportsPage,
});

function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [asOf, setAsOf] = useState("");

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86_400_000;

  const trialBalance = useTrialBalance({ asOf: asOf || String(now) });
  const balanceSheet = useBalanceSheet({ asOf: asOf || String(now) });
  const profitLoss = useProfitLoss({
    from: from || String(thirtyDaysAgo),
    to: to || String(now),
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">
            Trial balance, balance sheet, and profit & loss from journal data.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">As of date</label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="h-8 border border-input rounded-md px-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 border border-input rounded-md px-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 border border-input rounded-md px-2 text-sm"
            />
          </div>
        </div>

        <Tabs defaultValue="trial-balance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          </TabsList>

          <TabsContent value="trial-balance" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Trial Balance</h2>
              {trialBalance.data?.outOfBalance && (
                <span className="text-xs font-medium text-red-600">⚠ Out of balance</span>
              )}
            </div>
            {trialBalance.isLoading ? (
              <div className="animate-pulse h-4 w-64 bg-gray-200 rounded" />
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Type</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.data?.rows.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-muted-foreground">{a.code}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell className="text-right text-sm">{a.type}</TableCell>
                        <TableCell className="text-right">{formatMoney(a.debit ?? 0)}</TableCell>
                        <TableCell className="text-right">{formatMoney(a.credit ?? 0)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(a.balance ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t">
                      <TableCell colSpan={3} className="text-right">Totals</TableCell>
                      <TableCell className="text-right">{formatMoney(trialBalance.data?.totalDebit ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatMoney(trialBalance.data?.totalCredit ?? 0)}</TableCell>
                      <TableCell className="text-right"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="balance-sheet" className="space-y-4">
            <h2 className="text-sm font-semibold">Balance Sheet</h2>
            {balanceSheet.isLoading ? (
              <div className="animate-pulse h-4 w-64 bg-gray-200 rounded" />
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assets</h3>
                  <div className="space-y-2">
                    {balanceSheet.data?.assets.map((a: any) => (
                      <div key={a.code} className="flex justify-between text-sm">
                        <span>{a.name}</span>
                        <span className="text-right">{formatMoney(a.balance ?? 0)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t font-bold">
                      <span>Total Assets</span>
                      <span className="text-right">{formatMoney(balanceSheet.data?.totalAssets ?? 0)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Liabilities</h3>
                  <div className="space-y-2">
                    {balanceSheet.data?.liabilities.map((a: any) => (
                      <div key={a.code} className="flex justify-between text-sm">
                        <span>{a.name}</span>
                        <span className="text-right">{formatMoney(a.balance ?? 0)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t font-bold">
                      <span>Total Liabilities</span>
                      <span className="text-right">{formatMoney(balanceSheet.data?.totalLiabilities ?? 0)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equity</h3>
                  <div className="space-y-2">
                    {balanceSheet.data?.equity.map((a: any) => (
                      <div key={a.code} className="flex justify-between text-sm">
                        <span>{a.name}</span>
                        <span className="text-right">{formatMoney(a.balance ?? 0)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t font-bold">
                      <span>Total Equity</span>
                      <span className="text-right">{formatMoney(balanceSheet.data?.totalEquity ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm font-medium">
                  <span>Assets − (Liabilities + Equity)</span>
                  <span className="text-right">{formatMoney(balanceSheet.data?.balances ?? 0)}</span>
                </div>
              </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="profit-loss" className="space-y-4">
            <h2 className="text-sm font-semibold">Profit & Loss</h2>
            {profitLoss.isLoading ? (
              <div className="animate-pulse h-4 w-64 bg-gray-200 rounded" />
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</h3>
                  <div className="space-y-2">
                    {profitLoss.data?.revenue.map((a: any) => (
                      <div key={a.code} className="flex justify-between text-sm">
                        <span>{a.name}</span>
                        <span className="text-right">{formatMoney(a.amount ?? 0)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t font-bold">
                      <span>Total Revenue</span>
                      <span className="text-right">{formatMoney(profitLoss.data?.totalRevenue ?? 0)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expenses</h3>
                  <div className="space-y-2">
                    {profitLoss.data?.expenses.map((a: any) => (
                      <div key={a.code} className="flex justify-between text-sm">
                        <span>{a.name}</span>
                        <span className="text-right">{formatMoney(a.amount ?? 0)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t font-bold">
                      <span>Total Expenses</span>
                      <span className="text-right">{formatMoney(profitLoss.data?.totalExpenses ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-lg font-bold">
                  <span>Net Profit</span>
                  <span className="text-right">{formatMoney(profitLoss.data?.netProfit ?? 0)}</span>
                </div>
              </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}