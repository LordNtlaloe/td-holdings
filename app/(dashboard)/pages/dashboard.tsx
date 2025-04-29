import { Chart } from '@/components/general/area-chart';
import DashboardCard from '@/components/general/cards/dashboard-card';
import AppLayout from '@/layouts/app-layout';
import { FaShoppingCart, FaUsers, FaBuilding, FaFileInvoice } from "react-icons/fa";
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

type Item = {
    id: number
}


type PageProps = {
    products: Item[];
    employees: Item[];
    branches: Item[];
    orders: Item[];
}

export default function Dashboard() {
    const [totalProducts, setTotalProducts] = useState(0);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [totalBranches, setTotalBranches] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const { products, employees, branches, orders } = usePage<PageProps>().props;

    useEffect(() => {
        setTotalProducts(products.length);
        setTotalEmployees(employees.length);
        setTotalBranches(branches.length);
        setTotalOrders(orders.length)
    }, [products, employees, branches, orders])

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="auto-rows-min gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-3/2 object-fill overflow-hidden rounded-xl border">
                        <div className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20">
                            <DashboardCard title='Products' icon={<FaShoppingCart />}
                                content={totalProducts} metrics='-5%' bgClass="bg-gradient-to-tr from-blue-600 to-blue-400 shadow-blue-500/40"
                            />
                        </div>
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-3/2 object-fill overflow-hidden rounded-xl border">
                        <div className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20">
                            <DashboardCard title='Employees' icon={<FaUsers />}
                                content={totalEmployees} metrics='-5%' bgClass='bg-gradient-to-tr from-green-600 to-green-400 text-white shadow-green-500/40'
                            />
                        </div>
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-3/2 object-fill overflow-hidden rounded-xl border">
                        <div className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20">
                            <DashboardCard title='Branches' icon={<FaBuilding />}
                                content={totalBranches} metrics='-5%' bgClass="bg-gradient-to-tr from-purple-600 to-purple-400 shadow-purple-500/40"
                            />
                        </div>
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-3/2 object-fill overflow-hidden rounded-xl border">
                        <div className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20">
                            <DashboardCard title='Orders' icon={<FaFileInvoice />}
                                content={totalOrders} metrics='-5%' bgClass="bg-gradient-to-tr from-red-600 to-red-400 shadow-red-500/40"
                            />
                        </div>
                    </div>
                </div>
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-screen flex-1 overflow-y-auto rounded-xl border md:min-h-min scrollbar-hide">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 absolute inset-0 size-full p-4 mb-4">
                        <Chart />
                        <Chart />
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
