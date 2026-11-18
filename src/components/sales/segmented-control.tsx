"use client";

import { cn } from "@/lib/utils";
import { focusRing } from "./theme";

interface SegmentedControlProps<T extends string> {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    className?: string;
}

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    label,
    className,
}: SegmentedControlProps<T>) {
    return (
        <div
            role="group"
            aria-label={label}
            className={cn("flex rounded-[10px] bg-[#e8eaee] p-0.75", className)}
        >
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "min-h-11 rounded-lg px-3.5 text-sm transition-colors",
                            focusRing,
                            active
                                ? "bg-white font-semibold text-[#14181f] shadow-sm"
                                : "text-[#3d4452] hover:text-[#14181f]"
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}