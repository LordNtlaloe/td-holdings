import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Link } from '@tanstack/react-router';
import {
    LayoutDashboard, Users, ShoppingCart, Package, Boxes,
    Truck, Receipt, ClipboardList, Building2, Contact,
    BarChart3, Settings, HelpCircle, ScrollText, type LucideIcon
} from 'lucide-react';
import { useCurrentUser } from '#/lib/api/hooks';
import AppLogo from './app-logo';

interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    roles?: string[];
}

// Roles match the schema's users.role union: super_admin, admin, manager, cashier.
const mainNavItems: NavItem[] = [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager', 'cashier'] },
    { title: 'POS', url: '/pos', icon: ShoppingCart, roles: ['super_admin', 'admin', 'manager', 'cashier'] },
    { title: 'Sales', url: '/dashboard/sales', icon: Receipt, roles: ['super_admin', 'admin', 'manager', 'cashier'] },
    { title: 'Products', url: '/dashboard/products', icon: Package, roles: ['super_admin', 'admin', 'manager'] },
    { title: 'Inventory', url: '/dashboard/inventory', icon: Boxes, roles: ['super_admin', 'admin', 'manager'] },
    { title: 'Transfers', url: '/dashboard/transfers', icon: Truck, roles: ['super_admin', 'admin', 'manager'] },
    { title: 'Purchases', url: '/dashboard/purchases', icon: ClipboardList, roles: ['super_admin', 'admin', 'manager'] },
    { title: 'Customers', url: '/dashboard/customers', icon: Contact, roles: ['super_admin', 'admin', 'manager', 'cashier'] },
    { title: 'Suppliers', url: '/dashboard/suppliers', icon: Truck, roles: ['super_admin', 'admin', 'manager'] },
    { title: 'Stores', url: '/dashboard/stores', icon: Building2, roles: ['super_admin', 'admin'] },
    { title: 'Reports', url: '/dashboard/reports', icon: BarChart3, roles: ['super_admin', 'admin'] },
    { title: 'Activity Logs', url: '/dashboard/activity-logs', icon: ScrollText, roles: ['super_admin', 'admin'] },
    { title: 'Employees', url: '/dashboard/employees', icon: Users, roles: ['super_admin', 'admin'] },
];

const footerNavItems: NavItem[] = [
    { title: 'Settings', url: '/dashboard/settings', icon: Settings, roles: ['super_admin', 'admin', 'manager', 'cashier'] },
    { title: 'Help', url: '/dashboard/help', icon: HelpCircle, roles: ['super_admin', 'admin', 'manager', 'cashier'] },
];

export function AppSidebar() {
    const { data: userData } = useCurrentUser();
    const userRole = userData?.user?.role;

    // Filter items based on user role
    const filteredMainItems = mainNavItems.filter(item =>
        !userRole || !item.roles || item.roles.includes(userRole)
    );

    const filteredFooterItems = footerNavItems.filter(item =>
        !userRole || !item.roles || item.roles.includes(userRole)
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/dashboard">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredMainItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={filteredFooterItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}