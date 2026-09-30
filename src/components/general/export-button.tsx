import { Download, FileText, FileJson, Printer } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

interface ExportButtonProps<T extends Record<string, unknown>> {
    /** The data rows to export */
    data: T[]
    /**
     * Column definitions — controls which fields are included and their header labels.
     * If omitted, all keys from the first row are used as-is.
     */
    columns?: Array<{
        key: keyof T
        header: string
        /** optional transform before writing to file */
        format?: (value: unknown) => string
    }>
    /** Base filename without extension, e.g. "users-export" */
    filename?: string
    /** Label shown on the button */
    label?: string
    /** Disable specific formats */
    formats?: Array<'csv' | 'json' | 'print'>
    disabled?: boolean
    variant?: React.ComponentProps<typeof Button>['variant']
    size?: React.ComponentProps<typeof Button>['size']
}

// ── helpers ───────────────────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

function toCSV<T extends Record<string, unknown>>(
    data: T[],
    columns?: ExportButtonProps<T>['columns']
): string {
    if (data.length === 0) return ''

    const cols = columns
        ? columns
        : (Object.keys(data[0]) as Array<keyof T>).map(k => ({
            key: k,
            header: String(k),
            format: undefined,
        }))

    const escape = (v: unknown) => {
        const s = String(v ?? '')
        // wrap in quotes if contains comma, newline, or quote
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }

    const header = cols.map(c => escape(c.header)).join(',')
    const rows = data.map(row =>
        cols
            .map(c => {
                const raw = row[c.key]
                const val = c.format ? c.format(raw) : raw
                return escape(val)
            })
            .join(',')
    )

    return [header, ...rows].join('\r\n')
}

function toJSON<T extends Record<string, unknown>>(
    data: T[],
    columns?: ExportButtonProps<T>['columns']
): string {
    if (!columns) return JSON.stringify(data, null, 2)

    const shaped = data.map(row =>
        Object.fromEntries(
            columns.map(c => [
                c.header,
                c.format ? c.format(row[c.key]) : row[c.key],
            ])
        )
    )
    return JSON.stringify(shaped, null, 2)
}

// ── component ─────────────────────────────────────────────────────────────────

export function ExportButton<T extends Record<string, unknown>>({
    data,
    columns,
    filename = 'export',
    label = 'Export',
    formats = ['csv', 'json', 'print'],
    disabled = false,
    variant = 'outline',
    size = 'sm',
}: ExportButtonProps<T>) {
    const handleCSV = () => {
        const csv = toCSV(data, columns)
        triggerDownload(csv, `${filename}.csv`, 'text/csv;charset=utf-8;')
    }

    const handleJSON = () => {
        const json = toJSON(data, columns)
        triggerDownload(json, `${filename}.json`, 'application/json')
    }

    const handlePrint = () => {
        window.print()
    }

    const enabled = formats.filter(f =>
        ['csv', 'json', 'print'].includes(f)
    )

    // if only one format enabled, render a plain button instead of a dropdown
    if (enabled.length === 1) {
        const fmt = enabled[0]
        const handlers = { csv: handleCSV, json: handleJSON, print: handlePrint }
        const icons = {
            csv: <FileText className="size-3.5" />,
            json: <FileJson className="size-3.5" />,
            print: <Printer className="size-3.5" />,
        }
        return (
            <Button
                variant={variant}
                size={size}
                disabled={disabled || data.length === 0}
                onClick={handlers[fmt]}
                className="gap-1.5"
            >
                {icons[fmt]}
                {label}
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    disabled={disabled || data.length === 0}
                    className="gap-1.5"
                >
                    <Download className="size-3.5" />
                    {label}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-40 bg-background">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Download as
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {formats.includes('csv') && (
                    <DropdownMenuItem onClick={handleCSV} className="gap-2 cursor-pointer">
                        <FileText className="size-3.5 text-muted-foreground" />
                        CSV
                    </DropdownMenuItem>
                )}

                {formats.includes('json') && (
                    <DropdownMenuItem onClick={handleJSON} className="gap-2 cursor-pointer">
                        <FileJson className="size-3.5 text-muted-foreground" />
                        JSON
                    </DropdownMenuItem>
                )}

                {formats.includes('print') && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                            <Printer className="size-3.5 text-muted-foreground" />
                            Print / PDF
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}