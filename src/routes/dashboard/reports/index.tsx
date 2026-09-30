// app/routes/dashboard/reports/index.tsx
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useApiQuery } from '#/lib/api/hooks'
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  BarChart3,
  Package,
  Users,
  ShoppingCart,
  Truck,
  DollarSign,
  UserCog,
  Activity,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  DateRangeFilter,
  StoreFilter,
  DepartmentFilter,
  CategoryFilter,
  StatusFilter,
  CustomerFilter,
  SupplierFilter,
  SummaryCardsRow,
  ReportTable,
  ChartCard,
  RevenueBarChart,
  SalesLineChart,
  CategoryPieChart,
  TopProductsChart,
  StockLevelBadge,
  TransferStatusBadge,
  ActivityTimeline,
  ProfitLossCard,
  ExpenseBreakdownCard,
  InventoryValueCard,
  ExportDropdown,
  PrintButton,
  ReportSkeleton,
  ReportSettingsModal,
  type KPI,
  type ReportData,
  type ReportColumn,
} from "#/components/reports";
import { formatCurrency, formatDate, formatDateTime } from "@/components/reports/report-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "#/layouts/app-layout";

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard/reports/")({
  component: ReportsPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN REPORTS PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function ReportsPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [selectedStore, setSelectedStore] = useState<string | undefined>();
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: stores } = useApiQuery<any>('reports.allStores', '/api/stores')
  const { data: departments } = useApiQuery<any>('departments.getAllDepartments', '/api/departments')
  const { data: categories } = useApiQuery<any>('categories.getAllCategories', '/api/categories')
  const { data: customers } = useApiQuery<any>('customers.getAllCustomers', '/api/customers')
  const { data: suppliers } = useApiQuery<any>('suppliers.getAllSuppliers', '/api/suppliers')

  // ─────────────────────────────────────────────────────────────────────────────
  // SALES REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: dailySales } = useApiQuery<any>('reports.dailySalesReport', '/api/reports/daily-sales', {
    storeId: selectedStore,
    date: String(dateRange.from?.getTime() || Date.now()),
  })

  const { data: salesByProduct } = useApiQuery<any>('reports.salesByProduct', '/api/reports/sales-by-product', {
    storeId: selectedStore,
    from: String(dateRange.from?.getTime() || Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: String(dateRange.to?.getTime() || Date.now()),
  })

  const { data: topProducts } = useApiQuery<any>('reports.topSellingProducts', '/api/reports/top-products', {
    storeId: selectedStore,
    from: String(dateRange.from?.getTime() || Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: String(dateRange.to?.getTime() || Date.now()),
    limit: '10',
  })

  const { data: salesByCategory } = useApiQuery<any>('reports.salesByCategory', '/api/reports/sales-by-category', {
    storeId: selectedStore,
    from: String(dateRange.from?.getTime() || Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: String(dateRange.to?.getTime() || Date.now()),
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // INVENTORY REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: currentStock } = useApiQuery<any>('reports.currentStockReport', '/api/reports/current-stock', {
    storeId: selectedStore,
  })

  const { data: lowStock } = useApiQuery<any>('reports.lowStockReport', '/api/reports/low-stock', {
    storeId: selectedStore,
  })

  const { data: outOfStock } = useApiQuery<any>('reports.outOfStockReport', '/api/reports/out-of-stock', {
    storeId: selectedStore,
  })

  const { data: stockValuation } = useApiQuery<any>('reports.stockValuation', '/api/reports/stock-valuation', {
    storeId: selectedStore,
  })

  const { data: inventoryByDept } = useApiQuery<any>('reports.inventoryByDepartment', '/api/reports/inventory-by-department', {
    storeId: selectedStore,
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // CUSTOMER REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: topCustomers } = useApiQuery<any>('reports.topCustomers', '/api/reports/top-customers', { limit: '10' })
  const { data: inactiveCustomers } = useApiQuery<any>('reports.inactiveCustomers', '/api/reports/inactive-customers', { days: '90' })
  const { data: customerVisitFrequency } = useApiQuery<any>('reports.customerVisitFrequency', '/api/reports/customer-visit-frequency')

  // ─────────────────────────────────────────────────────────────────────────────
  // FINANCIAL REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: profitLoss } = useApiQuery<any>('reports.profitAndLoss', '/api/reports/profit-loss', {
    storeId: selectedStore,
    from: dateRange.from?.getTime() ? String(dateRange.from.getTime()) : undefined,
    to: dateRange.to?.getTime() ? String(dateRange.to.getTime()) : undefined,
  })

  const { data: expenseBreakdown } = useApiQuery<any>('reports.expenseByCategory', '/api/reports/expense-by-category', {
    storeId: selectedStore,
    from: dateRange.from?.getTime() ? String(dateRange.from.getTime()) : undefined,
    to: dateRange.to?.getTime() ? String(dateRange.to.getTime()) : undefined,
  })

  const { data: cashFlow } = useApiQuery<any>('reports.cashFlowReport', '/api/reports/cash-flow', {
    storeId: selectedStore,
    from: String(dateRange.from?.getTime() || Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: String(dateRange.to?.getTime() || Date.now()),
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // TRANSFER REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: transferHistory } = useApiQuery<any>('reports.transferHistory', '/api/reports/transfer-history', {
    storeId: selectedStore,
  })

  // Filter transfers by status if selected
  const filteredTransferHistory = transferHistory?.filter((t: any) => {
    if (!selectedStatus) return true;
    return t.status === selectedStatus;
  });

  const { data: pendingTransfers } = useApiQuery<any>('reports.pendingTransfers', '/api/reports/pending-transfers', {
    storeId: selectedStore,
  })

  const { data: receivedTransfers } = useApiQuery<any>('reports.receivedTransfers', '/api/reports/received-transfers', {
    storeId: selectedStore,
  })

  const { data: transferDiscrepancies } = useApiQuery<any>('reports.transferDiscrepancyReport', '/api/reports/transfer-discrepancies')

  // ─────────────────────────────────────────────────────────────────────────────
  // PURCHASE REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: purchaseHistory } = useApiQuery<any>('reports.purchaseHistory', '/api/reports/purchase-history', {
    storeId: selectedStore,
  })

  const { data: purchasesBySupplier } = useApiQuery<any>('reports.purchasesBySupplier', '/api/reports/purchases-by-supplier')

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVITY REPORTS
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: userActivity } = useApiQuery<any>('reports.userActivityReport', '/api/reports/user-activity', {
    limit: '50',
    from: dateRange.from?.getTime() ? String(dateRange.from.getTime()) : undefined,
    to: dateRange.to?.getTime() ? String(dateRange.to.getTime()) : undefined,
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const getCurrentReportData = () => {
    switch (activeTab) {
      case "sales":
        return salesByProduct || [];
      case "inventory":
        return currentStock || [];
      case "customers":
        return topCustomers || [];
      case "financial":
        return profitLoss ? [profitLoss] : [];
      case "transfers":
        return filteredTransferHistory || transferHistory || [];
      case "activity":
        return userActivity || [];
      case "purchases":
        return purchaseHistory || [];
      default:
        return [];
    }
  };

  const getReportHeaders = () => {
    switch (activeTab) {
      case "sales":
        return ["Product", "SKU", "Quantity Sold", "Revenue"];
      case "inventory":
        return ["Product", "SKU", "Store", "Quantity", "Value", "Status"];
      case "customers":
        return ["Customer", "Email", "Phone", "Total Spent", "Visits", "Last Purchase", "Loyalty Points"];
      case "financial":
        return ["Metric", "Amount"];
      case "transfers":
        return ["Status", "From", "To", "Created", "Received", "Notes"];
      case "activity":
        return ["User", "Action", "Description", "Time", "Role"];
      case "purchases":
        return ["Product", "SKU", "Quantity", "Unit Cost", "Total Cost", "Date"];
      default:
        return [];
    }
  };

  const getReportRows = () => {
    const data = getCurrentReportData();
    
    switch (activeTab) {
      case "sales":
        return data.map((item: any) => [
          item.name || "N/A",
          item.sku || "N/A",
          item.quantity || 0,
          formatCurrency(item.revenue || 0),
        ]);
      case "inventory":
        return data.map((item: any) => [
          item.productName || "N/A",
          item.sku || "N/A",
          item.storeName || "N/A",
          item.quantity || 0,
          formatCurrency(item.value || 0),
          item.quantity <= item.reorderLevel ? "Low Stock" : "In Stock",
        ]);
      case "customers":
        return data.map((item: any) => [
          item.name || "N/A",
          item.email || "N/A",
          item.phone || "N/A",
          formatCurrency(item.totalSpent || 0),
          item.visitCount || 0,
          item.lastPurchaseAt ? formatDate(item.lastPurchaseAt) : "Never",
          item.loyaltyPoints || 0,
        ]);
      case "financial":
        if (data.length > 0) {
          return [
            ["Income", formatCurrency(0)],
            ["Expenses", formatCurrency(0)],
            ["Profit", formatCurrency(0)],
          ];
        }
        return [];
      case "transfers":
        return data.map((item: any) => [
          item.status || "N/A",
          item.fromStore || "N/A",
          item.toStore || "N/A",
          formatDateTime(item.createdAt || Date.now()),
          item.receivedAt ? formatDateTime(item.receivedAt) : "—",
          item.notes || "N/A",
        ]);
      case "activity":
        return data.map((item: any) => [
          item.userName || "N/A",
          item.action || "N/A",
          item.description || "N/A",
          formatDateTime(item.createdAt || Date.now()),
          item.role || "N/A",
        ]);
      case "purchases":
        return data.map((item: any) => [
          item.productName || "N/A",
          item.sku || "N/A",
          item.quantity || 0,
          formatCurrency(item.costPrice || 0),
          formatCurrency(item.totalCost || 0),
          item.purchaseDate ? formatDate(item.purchaseDate) : "N/A",
        ]);
      default:
        return [];
    }
  };

  const getReportTitle = () => {
    const titles: Record<string, string> = {
      sales: "Sales Report",
      inventory: "Inventory Report",
      customers: "Customer Report",
      financial: "Financial Report",
      transfers: "Transfer Report",
      activity: "Activity Report",
      purchases: "Purchase Report",
    };
    return titles[activeTab] || "Report";
  };

  const getReportSubtitle = () => {
    let subtitle = "";
    if (selectedStore) {
      const store = stores?.find((s: any) => s._id === selectedStore);
      subtitle += store ? `Store: ${store.name}` : "";
    }
    if (dateRange.from && dateRange.to) {
      subtitle += subtitle ? " | " : "";
      subtitle += `Period: ${formatDate(dateRange.from.getTime())} - ${formatDate(dateRange.to.getTime())}`;
    }
    if (selectedCategory) {
      const category = categories?.find((c: any) => c._id === selectedCategory);
      subtitle += subtitle ? " | " : "";
      subtitle += category ? `Category: ${category.name}` : "";
    }
    if (selectedDepartment) {
      const dept = departments?.find((d: any) => d._id === selectedDepartment);
      subtitle += subtitle ? " | " : "";
      subtitle += dept ? `Department: ${dept.name}` : "";
    }
    return subtitle || "All Data";
  };

  const exportToCSV = () => {
    const headers = getReportHeaders();
    const rows = getReportRows();
    
    if (headers.length === 0 || rows.length === 0) {
      alert("No data to export");
      return;
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${getReportTitle()}_${formatDate(Date.now())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const headers = getReportHeaders();
    const rows = getReportRows();
    
    if (headers.length === 0 || rows.length === 0) {
      alert("No data to export");
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    doc.setFontSize(18);
    doc.text(getReportTitle(), 14, 20);
    
    // Add subtitle
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(getReportSubtitle(), 14, 30);
    
    // Add date generated
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generated: ${formatDateTime(Date.now())}`, 14, 37);

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 42,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Add footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageCount = doc.getNumberOfPages();
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `TD Inventory System - ${getReportTitle()}`,
          doc.internal.pageSize.width - data.settings.margin.right - 50,
          doc.internal.pageSize.height - 10
        );
      },
    });

    // Save the PDF
    doc.save(`${getReportTitle()}_${formatDate(Date.now())}.pdf`);
  };

  const exportToExcel = () => {
    // For Excel export, we can use CSV format since Excel can open CSV files
    exportToCSV();
  };

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    switch (format) {
      case 'csv':
        exportToCSV();
        break;
      case 'pdf':
        exportToPDF();
        break;
      case 'excel':
        exportToExcel();
        break;
      default:
        break;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({
        from: range.from,
        to: range.to,
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const renderFilters = () => (
    <div className="flex flex-wrap items-center gap-4">
      <StoreFilter
        stores={stores || []}
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
      />
      <DateRangeFilter
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
      {activeTab === "sales" && (
        <>
          <CategoryFilter
            categories={categories || []}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
          <DepartmentFilter
            departments={departments || []}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
          />
        </>
      )}
      {activeTab === "customers" && (
        <CustomerFilter
          customers={customers || []}
          selectedCustomer={selectedCustomer}
          onCustomerChange={setSelectedCustomer}
        />
      )}
      {activeTab === "purchases" && (
        <SupplierFilter
          suppliers={suppliers || []}
          selectedSupplier={selectedSupplier}
          onSupplierChange={setSelectedSupplier}
        />
      )}
      {["transfers", "purchases"].includes(activeTab) && (
        <StatusFilter
          statuses={["pending", "in_transit", "received", "cancelled"]}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
      )}
    </div>
  );

  const renderActions = () => (
    <div className="flex items-center gap-2">
      <ReportSettingsModal
        settings={{
          showSummaryCards: true,
          showCharts: true,
          showTable: true,
          dateFormat: "MM/DD/YYYY",
          currencyFormat: "LSL",
        }}
        onSettingsChange={() => {}}
      />
      <ExportDropdown
        onExportCSV={() => handleExport('csv')}
        onExportPDF={() => handleExport('pdf')}
        onExportExcel={() => handleExport('excel')}
      />
      <PrintButton onPrint={handlePrint} />
    </div>
  );

  const renderSalesReport = () => {
    if (!dailySales || !salesByProduct || !topProducts) {
      return <ReportSkeleton />;
    }

    // Filter products by category if selected
    const filteredProducts = selectedCategory 
      ? salesByProduct.filter(() => {
          // Client-side filtering would need product details
          // For now, return all products
          return true;
        })
      : salesByProduct;

    const salesKpis: KPI[] = [
      {
        label: "Total Revenue",
        value: formatCurrency(dailySales.totalRevenue),
        icon: <DollarSign className="h-4 w-4" />,
      },
      {
        label: "Total Sales",
        value: dailySales.totalSales,
        icon: <ShoppingCart className="h-4 w-4" />,
      },
      {
        label: "Average Sale",
        value: formatCurrency(dailySales.averageSale),
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        label: "Products Sold",
        value: filteredProducts.length,
        icon: <Package className="h-4 w-4" />,
      },
    ];

    const productColumns: ReportColumn[] = [
      { key: "name", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "quantity", header: "Quantity Sold" },
      {
        key: "revenue",
        header: "Revenue",
        accessor: (row) => formatCurrency(row.revenue),
      },
    ];

    const productData: ReportData = {
      columns: productColumns,
      rows: filteredProducts.slice(0, 20),
      summary: [
        { label: "Total Products", value: filteredProducts.length },
        { label: "Total Revenue", value: formatCurrency(dailySales.totalRevenue) },
      ],
    };

    return (
      <div className="space-y-6">
        <SummaryCardsRow kpis={salesKpis} />

        <div className="grid gap-6 md:grid-cols-2">
          <ChartCard title="Revenue by Store">
            <RevenueBarChart
              data={dailySales.byStore.map((s: any) => ({
                label: s.storeName,
                revenue: s.revenue,
              }))}
            />
          </ChartCard>
          <ChartCard title="Sales by Category">
            <CategoryPieChart
              data={salesByCategory?.map((c: any) => ({
                name: c.name,
                value: c.revenue,
              })) || []}
            />
          </ChartCard>
        </div>

        <ChartCard title="Top Selling Products">
          <TopProductsChart
            data={topProducts.map((p: any) => ({
              name: p.name,
              quantity: p.quantity,
              revenue: p.revenue,
            }))}
          />
        </ChartCard>

        <ReportTable data={productData} />
      </div>
    );
  };

  const renderInventoryReport = () => {
    if (!currentStock || !lowStock || !stockValuation || !inventoryByDept) {
      return <ReportSkeleton />;
    }

    const inventoryKpis: KPI[] = [
      {
        label: "Total Stock Value",
        value: formatCurrency(stockValuation.totalValue),
        icon: <DollarSign className="h-4 w-4" />,
      },
      {
        label: "Total Products",
        value: currentStock.length,
        icon: <Package className="h-4 w-4" />,
      },
      {
        label: "Low Stock Items",
        value: lowStock.length,
        icon: <TrendingDown className="h-4 w-4" />,
        change: lowStock.length > 0 ? -100 : 0,
      },
      {
        label: "Out of Stock",
        value: outOfStock?.length || 0,
        icon: <TrendingDown className="h-4 w-4" />,
      },
    ];

    const stockColumns: ReportColumn[] = [
      { key: "productName", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "storeName", header: "Store" },
      { key: "quantity", header: "Quantity" },
      {
        key: "value",
        header: "Value",
        accessor: (row) => formatCurrency(row.value),
      },
      {
        key: "status",
        header: "Status",
        accessor: (row) => (
          <StockLevelBadge quantity={row.quantity} reorderLevel={row.reorderLevel} />
        ),
      },
    ];

    const stockData: ReportData = {
      columns: stockColumns,
      rows: currentStock.slice(0, 20),
      summary: [
        { label: "Total Value", value: formatCurrency(stockValuation.totalValue) },
        { label: "Low Stock Items", value: lowStock.length },
        { label: "Out of Stock", value: outOfStock?.length || 0 },
      ],
    };

    return (
      <div className="space-y-6">
        <SummaryCardsRow kpis={inventoryKpis} />

        <div className="grid gap-6 md:grid-cols-2">
          <InventoryValueCard
            totalValue={stockValuation.totalValue}
            byStore={stockValuation.byStore}
          />
          <ChartCard title="Inventory by Department">
            <CategoryPieChart
              data={inventoryByDept.map((d: any) => ({
                name: d.name,
                value: d.value,
              }))}
            />
          </ChartCard>
        </div>

        {lowStock.length > 0 && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((item: any, index: any) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{item.productName} ({item.sku})</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{item.storeName}</span>
                      <StockLevelBadge quantity={item.quantity} reorderLevel={item.reorderLevel} />
                    </div>
                  </div>
                ))}
                {lowStock.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{lowStock.length - 5} more items
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <ReportTable data={stockData} />
      </div>
    );
  };

  const renderCustomerReport = () => {
    if (!topCustomers || !inactiveCustomers || !customerVisitFrequency) {
      return <ReportSkeleton />;
    }

    // Filter customers if selected
    const filteredCustomers = selectedCustomer
      ? topCustomers.filter((c: any) => c.name === customers?.find((cust: any) => cust._id === selectedCustomer)?.name)
      : topCustomers;

    const customerKpis: KPI[] = [
      {
        label: "Total Customers",
        value: filteredCustomers.length + inactiveCustomers.length,
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: "Top Customer Spend",
        value: formatCurrency(filteredCustomers[0]?.totalSpent || 0),
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        label: "Inactive Customers",
        value: inactiveCustomers.length,
        icon: <UserCog className="h-4 w-4" />,
      },
      {
        label: "Avg. Visits",
        value: (filteredCustomers.reduce((acc: any, c: any) => acc + c.visitCount, 0) / (filteredCustomers.length || 1)).toFixed(1),
        icon: <Activity className="h-4 w-4" />,
      },
    ];

    const customerColumns: ReportColumn[] = [
      { key: "name", header: "Customer" },
      { key: "email", header: "Email" },
      { key: "phone", header: "Phone" },
      {
        key: "totalSpent",
        header: "Total Spent",
        accessor: (row) => formatCurrency(row.totalSpent),
      },
      { key: "visitCount", header: "Visits" },
      {
        key: "lastPurchaseAt",
        header: "Last Purchase",
        accessor: (row) => row.lastPurchaseAt ? formatDate(row.lastPurchaseAt) : "Never",
      },
      { key: "loyaltyPoints", header: "Loyalty Points" },
    ];

    const customerData: ReportData = {
      columns: customerColumns,
      rows: filteredCustomers,
      summary: [
        { label: "Total Customers", value: filteredCustomers.length },
        { label: "Total Revenue", value: formatCurrency(filteredCustomers.reduce((acc: any, c: any) => acc + c.totalSpent, 0)) },
      ],
    };

    return (
      <div className="space-y-6">
        <SummaryCardsRow kpis={customerKpis} />

        <div className="grid gap-6 md:grid-cols-2">
          <ChartCard title="Customer Visit Frequency">
            <CategoryPieChart
              data={customerVisitFrequency.map((f: any) => ({
                name: f.label,
                value: f.count,
              }))}
            />
          </ChartCard>
          <ChartCard title="Top Customers by Spending">
            <RevenueBarChart
              data={filteredCustomers.slice(0, 5).map((c: any) => ({
                label: c.name,
                revenue: c.totalSpent,
              }))}
            />
          </ChartCard>
        </div>

        {inactiveCustomers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">Inactive Customers (90+ days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inactiveCustomers.slice(0, 5).map((customer: any, index: any) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{customer.name}</span>
                    <span className="text-muted-foreground">
                      Last purchase: {customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : "Never"}
                    </span>
                  </div>
                ))}
                {inactiveCustomers.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{inactiveCustomers.length - 5} more inactive customers
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <ReportTable data={customerData} />
      </div>
    );
  };

  const renderFinancialReport = () => {
    if (!profitLoss || !expenseBreakdown || !cashFlow) {
      return <ReportSkeleton />;
    }

    return (
      <div className="space-y-6">
        <ProfitLossCard
          income={profitLoss.income}
          expenses={profitLoss.expenses}
          profit={profitLoss.profit}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <ExpenseBreakdownCard data={expenseBreakdown} />
          <ChartCard title="Cash Flow Trend">
            <SalesLineChart
              data={cashFlow.timeline.map((t: any) => ({
                date: t.date,
                sales: t.moneyIn,
                revenue: t.moneyOut,
              }))}
            />
          </ChartCard>
        </div>

        {profitLoss.byStore.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss by Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profitLoss.byStore.map((store: any, index: any) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{store.storeName}</span>
                    <div className="flex items-center gap-6">
                      <span className="text-green-600">+{formatCurrency(store.income)}</span>
                      <span className="text-red-600">-{formatCurrency(store.expenses)}</span>
                      <span className={store.profit >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(store.profit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderTransferReport = () => {
    if (!transferHistory || !pendingTransfers) {
      return <ReportSkeleton />;
    }

    const displayData = filteredTransferHistory || transferHistory;

    const transferKpis: KPI[] = [
      {
        label: "Total Transfers",
        value: displayData.length,
        icon: <Truck className="h-4 w-4" />,
      },
      {
        label: "Pending",
        value: pendingTransfers.length,
        icon: <Truck className="h-4 w-4" />,
      },
      {
        label: "Received",
        value: receivedTransfers?.length || 0,
        icon: <Truck className="h-4 w-4" />,
      },
      {
        label: "Discrepancies",
        value: transferDiscrepancies?.length || 0,
        icon: <Activity className="h-4 w-4" />,
      },
    ];

    const transferColumns: ReportColumn[] = [
      {
        key: "status",
        header: "Status",
        accessor: (row) => <TransferStatusBadge status={row.status} />,
      },
      { key: "fromStore", header: "From" },
      { key: "toStore", header: "To" },
      {
        key: "createdAt",
        header: "Created",
        accessor: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "receivedAt",
        header: "Received",
        accessor: (row) => row.receivedAt ? formatDateTime(row.receivedAt) : "—",
      },
      { key: "notes", header: "Notes" },
    ];

    const transferData: ReportData = {
      columns: transferColumns,
      rows: displayData,
      summary: [
        { label: "Total Transfers", value: displayData.length },
        { label: "Pending", value: pendingTransfers.length },
      ],
    };

    return (
      <div className="space-y-6">
        <SummaryCardsRow kpis={transferKpis} />

        {pendingTransfers.length > 0 && (
          <Card className="border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-yellow-600">Pending Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingTransfers.slice(0, 5).map((transfer: any, index: any) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>
                      {transfer.fromStore} → {transfer.toStore}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateTime(transfer.createdAt)}
                    </span>
                  </div>
                ))}
                {pendingTransfers.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{pendingTransfers.length - 5} more pending transfers
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <ReportTable data={transferData} />
      </div>
    );
  };

  const renderPurchaseReport = () => {
    if (!purchaseHistory || !purchasesBySupplier) {
      return <ReportSkeleton />;
    }

    const purchaseKpis: KPI[] = [
      {
        label: "Total Purchases",
        value: purchaseHistory.length,
        icon: <ShoppingCart className="h-4 w-4" />,
      },
      {
        label: "Total Suppliers",
        value: purchasesBySupplier.length,
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: "Total Spent",
        value: formatCurrency(purchaseHistory.reduce((acc: any, p: any) => acc + p.totalCost, 0)),
        icon: <DollarSign className="h-4 w-4" />,
      },
      {
        label: "Avg. Purchase",
        value: formatCurrency(purchaseHistory.reduce((acc: any, p: any) => acc + p.totalCost, 0) / (purchaseHistory.length || 1)),
        icon: <BarChart3 className="h-4 w-4" />,
      },
    ];

    const purchaseColumns: ReportColumn[] = [
      { key: "productName", header: "Product" },
      { key: "sku", header: "SKU" },
      { key: "quantity", header: "Quantity" },
      {
        key: "costPrice",
        header: "Unit Cost",
        accessor: (row) => formatCurrency(row.costPrice),
      },
      {
        key: "totalCost",
        header: "Total Cost",
        accessor: (row) => formatCurrency(row.totalCost),
      },
      {
        key: "purchaseDate",
        header: "Date",
        accessor: (row) => row.purchaseDate ? formatDate(row.purchaseDate) : "N/A",
      },
    ];

    const purchaseData: ReportData = {
      columns: purchaseColumns,
      rows: purchaseHistory.slice(0, 20),
      summary: [
        { label: "Total Items", value: purchaseHistory.length },
        { label: "Total Cost", value: formatCurrency(purchaseHistory.reduce((acc: any, p: any) => acc + p.totalCost, 0)) },
      ],
    };

    return (
      <div className="space-y-6">
        <SummaryCardsRow kpis={purchaseKpis} />

        <div className="grid gap-6 md:grid-cols-2">
          <ChartCard title="Purchases by Supplier">
            <RevenueBarChart
              data={purchasesBySupplier.slice(0, 5).map((s: any) => ({
                label: s.name,
                revenue: s.total,
              }))}
            />
          </ChartCard>
          <ChartCard title="Top Suppliers">
            <CategoryPieChart
              data={purchasesBySupplier.slice(0, 5).map((s: any) => ({
                name: s.name,
                value: s.total,
              }))}
            />
          </ChartCard>
        </div>

        <ReportTable data={purchaseData} />
      </div>
    );
  };

  const renderActivityReport = () => {
    if (!userActivity) {
      return <ReportSkeleton />;
    }

    const activityData = userActivity.map((activity: any) => ({
      id: `${activity.userName}-${activity.createdAt}`,
      userName: activity.userName,
      action: activity.action,
      description: activity.description,
      createdAt: activity.createdAt,
      role: activity.role,
    }));

    const activityColumns: ReportColumn[] = [
      { key: "userName", header: "User" },
      { key: "action", header: "Action" },
      { key: "description", header: "Description" },
      {
        key: "createdAt",
        header: "Time",
        accessor: (row) => formatDateTime(row.createdAt),
      },
      { key: "role", header: "Role" },
    ];

    const activityReportData: ReportData = {
      columns: activityColumns,
      rows: userActivity,
      summary: [
        { label: "Total Activities", value: userActivity.length },
        { label: "Date Range", value: `${formatDate(dateRange.from?.getTime() || 0)} - ${formatDate(dateRange.to?.getTime() || 0)}` },
      ],
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={activityData} limit={10} />
          </CardContent>
        </Card>

        <ReportTable data={activityReportData} />
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              View and analyze your business performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            {renderActions()}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {renderFilters()}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Transfers
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Purchases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            {renderSalesReport()}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            {renderInventoryReport()}
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            {renderCustomerReport()}
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            {renderFinancialReport()}
          </TabsContent>

          <TabsContent value="transfers" className="space-y-6">
            {renderTransferReport()}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            {renderActivityReport()}
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6">
            {renderPurchaseReport()}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}