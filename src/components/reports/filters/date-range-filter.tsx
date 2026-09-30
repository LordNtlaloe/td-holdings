// components/reports/filters/date-range-filter.tsx
import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Define a local DateRange type that matches react-day-picker
interface DateRangeFilterProps {
    dateRange: { from?: Date; to?: Date } | undefined;
    onDateRangeChange: (range: { from?: Date; to?: Date } | undefined) => void;
    presets?: { label: string; range: { from: Date; to: Date } }[];
    className?: string;
}

export function DateRangeFilter({
    dateRange,
    onDateRangeChange,
    presets = [],
    className,
}: DateRangeFilterProps) {
    const [open, setOpen] = React.useState(false);

    const defaultPresets = [
        {
            label: "Today",
            range: {
                from: new Date(),
                to: new Date(),
            },
        },
        {
            label: "Yesterday",
            range: {
                from: new Date(Date.now() - 24 * 60 * 60 * 1000),
                to: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
        },
        {
            label: "This Week",
            range: {
                from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                to: new Date(),
            },
        },
        {
            label: "Last Week",
            range: {
                from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                to: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
        },
        {
            label: "This Month",
            range: {
                from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                to: new Date(),
            },
        },
        {
            label: "Last Month",
            range: {
                from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                to: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
        },
        {
            label: "This Quarter",
            range: {
                from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                to: new Date(),
            },
        },
        {
            label: "This Year",
            range: {
                from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                to: new Date(),
            },
        },
    ];

    const allPresets = [...defaultPresets, ...presets];

    const displayText = dateRange?.from
        ? dateRange.to
            ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
            : format(dateRange.from, "LLL dd, y")
        : "Select date range";

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-65 justify-start text-left font-normal",
                            !dateRange?.from && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {displayText}
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex">
                        {/* Presets */}
                        <div className="border-r p-2">
                            <Select
                                onValueChange={(value) => {
                                    const preset = allPresets.find(
                                        (p) => p.label === value
                                    );
                                    if (preset) {
                                        onDateRangeChange(preset.range);
                                        setOpen(false);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-37.5">
                                    <SelectValue placeholder="Quick select" />
                                </SelectTrigger>

                                <SelectContent>
                                    {allPresets.map((preset) => (
                                        <SelectItem
                                            key={preset.label}
                                            value={preset.label}
                                        >
                                            {preset.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Calendar */}
                        <div className="p-2">
                            <Calendar
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange as DateRange | undefined}
                                onSelect={(range) => {
                                    if (!range) {
                                        onDateRangeChange(undefined);
                                        return;
                                    }
                                    onDateRangeChange({
                                        from: range.from,
                                        to: range.to,
                                    });
                                }}
                                numberOfMonths={2}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}