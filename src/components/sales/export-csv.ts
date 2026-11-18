import { format } from "date-fns";

// ─────────────────────────── CSV ───────────────────────────

export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
    if (value === null || value === undefined) return "";

    const text = String(value);

    // Quote anything containing a comma, quote or line break.
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Downloads `rows` as a UTF-8 CSV file (BOM included so Excel reads it correctly). */
export function downloadCsv(fileName: string, rows: CsvCell[][]): void {
    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

// ─────────────────────────── Excel (.xlsx) ───────────────────────────

export type XlsxCell = string | number | null;

/**
 * A plain array is a normal data row. The object form styles the row:
 * "section" is a bold shaded band (e.g. a department heading) and
 * "subtotal" is a bold row with a line above it.
 */
export type XlsxRow =
    | XlsxCell[]
    | { kind: "section" | "subtotal"; cells: XlsxCell[] };

export interface XlsxExportOptions {
    fileName: string;
    sheetName: string;
    /** First line of the sheet, bold. */
    title: string;
    /** Lines under the title: date range, store, search filter, etc. */
    details: string[];
    header: string[];
    rows: XlsxRow[];
    totalRow?: XlsxCell[];
    /** 0-based column indexes formatted as money. */
    moneyColumns?: number[];
    /** 0-based column indexes formatted as whole numbers. */
    countColumns?: number[];
}

/** "14 Nov 2026" for a single day, "1 Jun 2026 – 30 Jun 2026" otherwise. */
export function formatDateRange(from: number, to: number): string {
    const start = new Date(from);
    const end = new Date(to);

    if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
        return format(start, "EEE d MMM yyyy");
    }

    return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

const MONEY_FORMAT = '"LSL" #,##0.00';
const COUNT_FORMAT = "#,##0";

export async function downloadXlsx(options: XlsxExportOptions): Promise<void> {
    const mod = await import("exceljs");
    const ExcelJS = (mod as any).default ?? mod;

    const money = new Set(options.moneyColumns ?? []);
    const counts = new Set(options.countColumns ?? []);
    const isNumeric = (col: number) => money.has(col) || counts.has(col);
    const colCount = options.header.length;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(options.sheetName.slice(0, 31));

    // ── Header block: title + date range / filters ────────────────────────
    const titleRow = sheet.addRow([options.title]);
    titleRow.font = { bold: true, size: 14 };

    for (const line of options.details) {
        const detailRow = sheet.addRow([line]);
        detailRow.font = { color: { argb: "FF5B6270" } };
    }

    sheet.addRow([]);

    // ── Column titles (bold) ──────────────────────────────────────────────
    const headerRow = sheet.addRow(options.header);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell: any, col: number) => {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F3F6" },
        };
        cell.border = { bottom: { style: "thin" } };
        cell.alignment = {
            horizontal: isNumeric(col - 1) ? "right" : "left",
            vertical: "middle",
            wrapText: true,
        };
    });
    const headerRowNumber = headerRow.number;

    // ── Data rows ─────────────────────────────────────────────────────────
    const applyFormats = (row: any) => {
        row.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
            if (money.has(col - 1)) cell.numFmt = MONEY_FORMAT;
            else if (counts.has(col - 1)) cell.numFmt = COUNT_FORMAT;
        });
    };

    for (const entry of options.rows) {
        const cells = Array.isArray(entry) ? entry : entry.cells;
        const kind = Array.isArray(entry) ? "row" : entry.kind;
        const row = sheet.addRow(cells);
        applyFormats(row);

        if (kind === "section") {
            row.font = { bold: true };
            for (let col = 1; col <= colCount; col++) {
                row.getCell(col).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF6F7F9" },
                };
            }
        }

        if (kind === "subtotal") {
            row.font = { bold: true };
            for (let col = 1; col <= colCount; col++) {
                row.getCell(col).border = { top: { style: "thin" } };
            }
        }
    }

    // ── Totals (bold) ─────────────────────────────────────────────────────
    if (options.totalRow) {
        const totalRow = sheet.addRow(options.totalRow);
        totalRow.font = { bold: true };
        applyFormats(totalRow);
        totalRow.eachCell({ includeEmpty: true }, (cell: any) => {
            cell.border = { top: { style: "medium" } };
        });
    }

    // ── Column widths (title/detail rows are ignored on purpose) ──────────
    options.header.forEach((title, index) => {
        let width = title.length;

        const sample = [
            ...options.rows
                .filter((r) => Array.isArray(r) || r.kind !== "section")
                .map((r) => (Array.isArray(r) ? r : r.cells)),
            ...(options.totalRow ? [options.totalRow] : []),
        ];
        for (const row of sample) {
            const value = row[index];
            if (value === null || value === undefined) continue;
            const length =
                typeof value === "number"
                    ? value.toLocaleString("en-US", { minimumFractionDigits: 2 }).length + 6
                    : String(value).length;
            if (length > width) width = length;
        }

        sheet.getColumn(index + 1).width = Math.min(Math.max(width + 2, 10), 42);
    });

    // No frozen panes: with a 5-row header block, some viewers (LibreOffice)
    // opened scrolled to the bottom and hid the whole list. The title and
    // column titles repeat on every printed page instead (printTitlesRow).
    sheet.views = [{ state: "normal", activeCell: "A1" }];

    // ── Print setup: landscape A4, always one page wide ───────────────────
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0, // as many pages tall as the rows need
        horizontalCentered: true,
        margins: {
            left: 0.4,
            right: 0.4,
            top: 0.5,
            bottom: 0.6,
            header: 0.3,
            footer: 0.3,
        },
        // Title, date range and column titles repeat on every printed page.
        printTitlesRow: `1:${headerRowNumber}`,
    };
    sheet.headerFooter.oddFooter = "&CPage &P of &N";

    // ── Download ──────────────────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = options.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}