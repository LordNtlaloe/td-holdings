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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
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
      setCategoryOpen(false);
      setCategoryQuery("");
      setDescription("");
      setDate(toDateInputValue(defaultDate ?? new Date()));
      setStoreId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const finalCategory = category.trim();

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
    if (finalCategory.length > MAX_CATEGORY_LENGTH) {
      toast.error(`Category can't be longer than ${MAX_CATEGORY_LENGTH} characters`);
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
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="expense-category"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between font-normal"
                  >
                    {category || "Select a category"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search or type a category"
                      value={categoryQuery}
                      onValueChange={setCategoryQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {COMMON_CATEGORIES.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={() => {
                              setCategory(c);
                              setCategoryQuery("");
                              setCategoryOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                category === c ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {categoryQuery.trim() &&
                        !COMMON_CATEGORIES.some(
                          (c) =>
                            c.toLowerCase() === categoryQuery.trim().toLowerCase()
                        ) && (
                          <CommandGroup heading="Custom category">
                            <CommandItem
                              value={categoryQuery.trim()}
                              onSelect={() => {
                                setCategory(categoryQuery.trim());
                                setCategoryQuery("");
                                setCategoryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  category === categoryQuery.trim() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {categoryQuery.trim()}
                            </CommandItem>
                          </CommandGroup>
                        )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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