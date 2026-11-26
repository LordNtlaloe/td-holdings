import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "#/layouts/app-layout";
import { useApiQuery } from "#/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { PiggyBank, ShieldAlert, Scale, TrendingUp, FileText } from "lucide-react";

export const Route = createFileRoute("/dashboard/accounting/")({
  component: AccountingPage,
});

function AccountingPage() {
  const { data: charts, isLoading } = useApiQuery<{ accounts: any[] }>(
    "accounts.list",
    "/api/accounting/accounts"
  );
  const { data: periods } = useApiQuery<{ periods: any[] }>("periods.list", "/api/accounting/periods");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse h-4 w-32 mb-4 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const accounts = charts?.accounts ?? [];
  const totalAssets = accounts
    .filter((a) => a.type === "asset")
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalLiabilities = accounts
    .filter((a) => a.type === "liability")
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalEquity = accounts
    .filter((a) => a.type === "equity")
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalRevenue = accounts
    .filter((a) => a.type === "revenue")
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalExpenses = accounts
    .filter((a) => a.type === "expense")
    .reduce((s, a) => s + Number(a.balance || 0), 0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Chart of accounts, journal entries, and financial reports
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssets.toLocaleString(undefined, {
                style: "currency",
                currency: "LSL",
              })}</div>
              <CardDescription className="text-xs">Asset account balances</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLiabilities.toLocaleString(undefined, {
                style: "currency",
                currency: "LSL",
              })}</div>
              <CardDescription className="text-xs">Liability account balances</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEquity.toLocaleString(undefined, {
                style: "currency",
                currency: "LSL",
              })}</div>
              <CardDescription className="text-xs">Equity account balances</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue.toLocaleString(undefined, {
                style: "currency",
                currency: "LSL",
              })}</div>
              <CardDescription className="text-xs">Revenue account balances</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExpenses.toLocaleString(undefined, {
                style: "currency",
                currency: "LSL",
              })}</div>
              <CardDescription className="text-xs">Expense account balances</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                View and manage all accounts with their balances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Assets, liabilities, equity, revenue, and expense accounts.
              </p>
            </CardContent>
            <CardFooter>
              <Link to="/dashboard/accounting/accounts">
                <Button>View chart of accounts</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
              <CardDescription>
                View all posted and draft journal entries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Double-entry journal with full drill-down into lines.
              </p>
            </CardContent>
            <CardFooter>
              <Link to="/dashboard/accounting/journal">
                <Button>View journal</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Trial balance, balance sheet, and profit & loss.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Standard accounting reports from journal data.
              </p>
            </CardContent>
            <CardFooter>
              <Link to="/dashboard/accounting/reports">
                <Button>View reports</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Period status */}
        <Card>
          <CardHeader>
            <CardTitle>Accounting Periods</CardTitle>
          </CardHeader>
          <CardContent>
            {periods?.periods?.length ? (
              <div className="space-y-2">
                {periods.periods.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-2 py-2 text-sm border-b border-muted-foreground/20 last:border-0"
                  >
                    <span>
                      {p.year}-{String(p.month).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        p.status === "closed"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No accounting periods defined yet. Periods are created automatically
                when journal entries are posted.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}