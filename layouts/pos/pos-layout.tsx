import AppLayoutTemplate from '@/layouts/app/app-header-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface POSLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

const POSLayout = ({ children, breadcrumbs, ...props }: POSLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        {children}
    </AppLayoutTemplate>
);

export default POSLayout;
