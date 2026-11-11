"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PeriodPickerProps {
  period: Period;
  anchor: Date;
  onPeriodChange: (period: Period) => void;
  onAnchorChange: (anchor: Date) => void;
  className?: string;
}
import { type Period, PERIOD_OPTIONS, shiftAnchor, formatPeriodLabel } from "#/lib/period-utils";

export function PeriodPicker({
  period,
  anchor,
  onPeriodChange,
  onAnchorChange,
  className,
}: PeriodPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div role="group" aria-label="Time period" className="inline-flex rounded-md border p-0.5">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={option.value === period ? "default" : "ghost"}
            aria-pressed={option.value === period}
            onClick={() => onPeriodChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label={`Previous ${period}`}
          onClick={() => onAnchorChange(shiftAnchor(period, anchor, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-48 justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatPeriodLabel(period, anchor)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              defaultMonth={anchor}
              selected={anchor}
              onSelect={(value) => {
                // Clicking the selected day clears it; keep the current anchor instead.
                if (!value) return;
                onAnchorChange(value);
                setOpen(false);
              }}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          aria-label={`Next ${period}`}
          onClick={() => onAnchorChange(shiftAnchor(period, anchor, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button variant="ghost" size="sm" onClick={() => onAnchorChange(new Date())}>
        Today
      </Button>
    </div>
  );
}