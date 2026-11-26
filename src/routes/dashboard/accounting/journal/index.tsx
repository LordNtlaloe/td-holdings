import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import AppLayout from "#/layouts/app-layout";
import { useJournalEntries } from "#/lib/api/hooks";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/accounting/journal/")({
  component: JournalPage,
});

function JournalPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useJournalEntries({
    from,
    to,
    search,
  });

  const entries = data?.entries ?? [];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Journal Entries</h1>
            <p className="text-sm text-muted-foreground">
              Double-entry journal. All postings are balanced and period-locked.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> New Entry
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
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
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Entry number or memo..."
              className="h-8 border border-input rounded-md px-2 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                  <TableCell className="text-right text-sm">
                    {new Date(entry.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{entry.memo ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(entry.totalDebit ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(entry.totalCredit ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.status === "posted"
                          ? "default"
                          : entry.status === "draft"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {entry.sourceType}
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground text-center py-4">
                    No journal entries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading entries...</p>
        )}
      </div>
    </AppLayout>
  );
}