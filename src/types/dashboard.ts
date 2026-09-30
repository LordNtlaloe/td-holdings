// src/types/dashboard.ts
// Full updated type — replace your existing file with this

export interface DashboardData {
    role: 'super_admin' | 'admin' | 'manager' | 'cashier'
    scope: 'global' | 'store' | 'none'

    stats: {
        totalRevenue: number
        totalSales: number
        lowStockCount: number
        activeStores: number
        avgTransactionValue: number
        grossProfitMargin: number
        stockTurnover: number
    }

    dailySeries: {
        date: string
        revenue: number
        salesCount: number
    }[]

    // New: hourly revenue buckets for the Sales by Hour chart
    hourlyBuckets?: {
        hour: number
        revenue: number
        count: number
    }[]

    // New: payment method split for the donut chart
    paymentBreakdown?: {
        method: string
        amount: number
    }[]

    topProducts: {
        name: string
        revenue: number
        quantity: number
    }[]

    // Top 10 by units sold — the non-revenue counterpart to `topProducts`
    topProductsByUnits?: {
        name: string
        revenue: number
        quantity: number
    }[]

    // Non-revenue performance indicators (volume / efficiency, not money)
    performance?: {
        unitsSold: number
        itemsPerSale: number
        sellThroughRate: number
        stockTurnover: number
        deadStockCount: number
        discountRate: number
        cancellationRate: number
        activeProducts: number
        totalProducts: number
    }

    lowStockItems: {
        productId: string
        productName: string
        storeName: string
        storeId: string
        quantity: number
        reorderLevel: number
        avgDailySales: number
        daysUntilStockout: number
    }[]

    // Extended: paymentMethod + visitCount added
    recentSales: {
        _id: string
        storeName: string
        customerName: string
        paymentMethod?: string | null
        visitCount?: number | null
        totalAmount: number
        status: string
        createdAt: number
    }[]

    storeBreakdown: {
        storeName: string
        revenue: number
        salesCount: number
        lowStockCount: number
        avgTransaction: number
    }[]

    transfers: {
        pendingCount: number
        inTransitCount: number
        recent: {
            _id: string
            fromStore: string
            toStore: string
            status: string
            createdAt: number
        }[]
    }

    activityFeed: {
        _id: string
        userName: string
        role: string
        action: string
        entityType: string | null
        description: string | null
        createdAt: number
    }[]

    purchases: {
        totalThisMonth: number
        pendingCount: number
        recent: {
            _id: string
            storeName: string
            supplierName: string
            totalAmount: number
            status: string
            createdAt: number
        }[]
    }

    customers: {
        total: number
        newThisMonth: number
        acquisitionRate: number
        tierDistribution: {
            bronze: number
            silver: number
            gold: number
            platinum: number
        }
        topSpenders: {
            id: any
            name: string
            totalSpent: number
            loyaltyPoints: number
            visitCount: number
            tier: string
        }[]
        atRisk: {
            id: any
            name: string
            lastPurchaseAt: number
            daysSinceLastPurchase: number
        }[]
        birthdaysThisWeek: any[]
    }

    inventory: {
        totalProducts: number
        totalStockValue: number
        lowStockCount: number
        deadStockCount: number
        expiringSoon: any[]
        stockCoverageDays: {
            productId: any
            productName: string
            currentStock: number
            avgDailySales: number
            coverageDays: number
        }[]
        turnoverByCategory: {
            category: string
            turnover: number
        }[]
    }

    financial: {
        grossProfit: number
        grossProfitMargin: number
        netProfit: number
        netProfitMargin: number
        totalExpenses: number
        cashFlow: {
            date: string
            inflow: number
            outflow: number
            balance: number
        }[]
        expenseBreakdown: {
            category: string
            amount: number
            percentage: number
        }[]
    }

    alerts: {
        id: string
        type: 'critical' | 'warning' | 'info'
        title: string
        message: string
        action?: string
    }[]
}