import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Link, useLocation } from '@tanstack/react-router';
import { type LucideIcon } from 'lucide-react';

interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const location = useLocation();
    const currentPath = location.pathname;

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isActive = item.url === currentPath;
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                className={
                                    isActive
                                        ? 'bg-cyan-900 text-white hover:bg-primary/15 hover:text-white dark:bg-cyan-900'
                                        : ''
                                }
                            >
                                <Link to={item.url}>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}