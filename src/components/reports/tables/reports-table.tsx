// components/reports/ReportTable.tsx
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MobileCardList } from "#/components/general/mobile-card-list";
import { type ReportData } from "#/types/reports";

interface ReportTableProps {
    data: ReportData;
    className?: string;
    onRowClick?: (row: any) => void;
}

export function ReportTable({ data, className, onRowClick }: ReportTableProps) {
    const cell = (col: (typeof data.columns)[number], row: any) =>
        col.accessor ? col.accessor(row) : row[col.key];

    return (
        <div className={className}>
            {/* Phones get cards — a report table can be 6+ columns wide. */}
            <MobileCardList
                items={data.rows}
                getId={(_row, index) => index}
                title={(row) =>
                    data.columns.length > 0 ? cell(data.columns[0], row) : null
                }
                fields={(row) =>
                    data.columns.slice(1).map((col) => ({
                        label: col.header,
                        value: cell(col, row),
                        className: col.className,
                    }))
                }
                onItemClick={onRowClick ? (row) => onRowClick(row) : undefined}
                empty="No data available"
            />

            <div className={cn("hidden rounded-md border md:block")}>
                <Table>
                <TableHeader>
                    <TableRow>
                        {data.columns.map((col) => (
                            <TableHead key={col.key} className={col.className}>
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.rows.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={data.columns.length}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No data available
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.rows.map((row, index) => (
                            <TableRow
                                key={index}
                                className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                                onClick={() => onRowClick?.(row)}
                            >
                                {data.columns.map((col) => (
                                    <TableCell key={col.key} className={col.className}>
                                        {col.accessor ? col.accessor(row) : row[col.key]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            {data.summary && data.summary.length > 0 && (
                <div className="border-t p-4 bg-muted/20">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {data.summary.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">{item.label}:</span>
                                <span className="font-semibold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </div>

            {/* the summary bar is worth keeping on a phone too */}
            {data.summary && data.summary.length > 0 && (
                <div className="mt-3 rounded-lg border bg-muted/20 p-4 md:hidden">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {data.summary.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">{item.label}:</span>
                                <span className="font-semibold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}