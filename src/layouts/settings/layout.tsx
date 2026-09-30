import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link, useRouter } from '@tanstack/react-router';
import { User, Lock, Palette, type LucideIcon } from 'lucide-react';

interface NavItem {
    title: string;
    url: string;
    icon: LucideIcon | null;
}

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        url: '/dashboard/settings/',
        icon: User,
    },
    {
        title: 'Password',
        url: '/dashboard/settings/password',
        icon: Lock,
    },
    {
        title: 'Appearance',
        url: '/dashboard/settings/appearance',
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const currentPath = router.state.location.pathname;

    return (
        <div className="px-4 py-6">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                <p className="text-muted-foreground text-sm">Manage your profile and account settings</p>
            </div>

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Button
                                    key={item.url}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn('w-full justify-start gap-2', {
                                        'bg-muted': currentPath === item.url,
                                    })}
                                >
                                    <Link to={item.url}>
                                        {Icon && <Icon className="h-4 w-4" />}
                                        {item.title}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}