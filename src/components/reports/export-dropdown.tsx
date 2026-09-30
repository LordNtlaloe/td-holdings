// components/reports/ExportDropdown.tsx
import { Download, FileSpreadsheet, FileText, FileJson } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExportDropdownProps {
    onExportCSV: () => void;
    onExportPDF: () => void;
    onExportExcel?: () => void;
    onExportJSON?: () => void;
    className?: string;
}

export function ExportDropdown({
    onExportCSV,
    onExportPDF,
    onExportExcel,
    onExportJSON,
    className,
}: ExportDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn("", className)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExportCSV}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                </DropdownMenuItem>
                {onExportExcel && (
                    <DropdownMenuItem onClick={onExportExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export as Excel
                    </DropdownMenuItem>
                )}
                {onExportJSON && (
                    <DropdownMenuItem onClick={onExportJSON}>
                        <FileJson className="mr-2 h-4 w-4" />
                        Export as JSON
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}