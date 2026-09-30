// components/reports/SummaryCardsRow.tsx
import { cn } from "@/lib/utils";
import { type KPI } from "#/types/reports";
import { KPICard } from "./kpi-card";

interface SummaryCardsRowProps {
    kpis: KPI[];
    className?: string;
}

export function SummaryCardsRow({ kpis, className }: SummaryCardsRowProps) {
    return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
            {kpis.map((kpi, index) => (
                <KPICard
                    key={index}
                    label={kpi.label}
                    value={kpi.value}
                    change={kpi.change}
                    icon={kpi.icon}
                />
            ))}
        </div>
    );
}