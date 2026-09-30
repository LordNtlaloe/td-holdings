
export function formatCurrency(amount: number): string {
    return `R${amount.toLocaleString('en-ZA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

export function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
    if (status === 'completed') return 'default'
    if (status === 'refunded' || status === 'voided') return 'destructive'
    return 'secondary'
}

export function startOfDay(date: Date): number {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
}

export function endOfDay(date: Date): number {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d.getTime()
}

export function getStatusLabel(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1)
}