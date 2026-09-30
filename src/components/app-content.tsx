import { SidebarInset } from '@/components/ui/sidebar';
import * as React from 'react';

interface AppContentProps extends React.ComponentProps<'div'> {
    variant?: 'header' | 'sidebar';
}

export function AppContent({ variant = 'header', children, ...props }: AppContentProps) {
    if (variant === 'sidebar') {
        return <SidebarInset {...props}>{children}</SidebarInset>;
    }

    // `w-full` together with `mx-6` pushed this 48px past the viewport on a
    // phone; `flex-1` already fills the space, and the margins inset the card
    // only where there is room for them.
    return (
        <main
            className="flex min-w-0 flex-1 flex-col gap-4 md:mx-6 md:my-6 md:rounded-xl"
            {...props}
        >
            {children}
        </main>
    );
}
