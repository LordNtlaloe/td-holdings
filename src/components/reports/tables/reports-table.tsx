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
import { type ReportData } from "#/types/reports";

interface ReportTableProps {
    data: ReportData;
    className?: string;
    onRowClick?: (row: any) => void;
}

export function ReportTable({ data, className, onRowClick }: ReportTableProps) {
    return (
        <div className={cn("rounded-md border", className)}>
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
                    <div className="flex flex-wrap gap-6">
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