// components/reports/report-utils.ts
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LS', {
        style: 'currency',
        currency: 'LSL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-LS', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-LS', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-LS').format(num);
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function calculateChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}