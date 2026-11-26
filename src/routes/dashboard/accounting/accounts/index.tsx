import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "#/layouts/app-layout";
import { useChartOfAccounts } from "#/lib/api/hooks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/accounting/accounts/")({
  component: AccountsPage,
});

function AccountsPage() {
  const { data, isLoading } = useChartOfAccounts();

  const accounts = data?.accounts ?? [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <h1 className="text-2xl font-semibold">Chart of Accounts</h1>
          <div className="animate-pulse h-4 w-64 mt-4 bg-gray-200 rounded" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">
            All accounts with their current balances.
          </p>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {a.code}
                  </TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell className="text-right text-sm">
                    <Badge variant="outline">{a.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(a.balance ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center py-4">
                    No accounts found. Seed the chart of accounts first.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        )}
      </div>
    </AppLayout>
  );
}