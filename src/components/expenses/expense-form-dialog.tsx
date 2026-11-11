"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const COMMON_CATEGORIES = [
  "Rent",
  "Salaries & Wages",
  "Utilities",
  "Supplies",
  "Transport",
  "Maintenance",
  "Marketing",
  "Insurance",
  "Other",
];

const MAX_CATEGORY_LENGTH = 60;

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isGlobal: boolean;
  stores?: any[];
  /** Date pre-filled when the dialog opens. Defaults to today. */
  defaultDate?: Date;
  onSubmit: (payload: {
    amount: number;
    category: string;
    description: string;
    date: number;
    storeId?: string;
  }) => Promise<unknown>;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  isGlobal,
  stores = [],
  defaultDate,
  onSubmit,
}: ExpenseFormDialogProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDateInputValue(defaultDate ?? new Date()));
  const [storeId, setStoreId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Fresh state each time the dialog opens. Deliberately keyed on `open` only:
  // `defaultDate` changing while the dialog is open must not wipe what's typed.
  useEffect(() => {
    if (open) {
      setAmount("");
      setCategory("");
      setCustomCategory("");
      setDescription("");
      setDate(toDateInputValue(defaultDate ?? new Date()));
      setStoreId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finalCategory =
    category === "Other" ? customCategory.trim() : category.trim();

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (submitting) return;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    if (!finalCategory) {
      toast.error("Choose a category or type a custom one");
      return;
    }
    if (isGlobal && !storeId) {
      toast.error("Select a store");
      return;
    }

    // Noon on the chosen day keeps it unambiguous regardless of timezone.
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) {
      toast.error("Pick a valid date");
      return;
    }
    const dateTs = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();

    setSubmitting(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        category: finalCategory,
        description: description.trim(),
        date: dateTs,
        storeId: isGlobal ? storeId : undefined,
      });
      onOpenChange(false);
      toast.success("Expense recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>
              Enter an expense for the day it was paid. It appears in that day's,
              week's and month's totals.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="expense-category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {category === "Other" && (
                <Input
                  aria-label="Custom category"
                  placeholder="Custom category"
                  maxLength={MAX_CATEGORY_LENGTH}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-description">Description (optional)</Label>
              <Textarea
                id="expense-description"
                placeholder="What was this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {isGlobal && (
              <div className="grid gap-2">
                <Label htmlFor="expense-store">Store</Label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger id="expense-store" className="w-full">
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store: any) => (
                      <SelectItem key={store._id ?? store.id} value={store._id ?? store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording..." : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}