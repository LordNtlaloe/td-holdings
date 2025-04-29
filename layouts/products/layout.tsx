import Heading from '@/components/general/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

type Branch = {
    id: number;
    branch_name: string;
};

export default function ProductsLayout({ children }: PropsWithChildren) {
    const { branches } = usePage<{ branches: Branch[] }>().props;

    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname + window.location.search;

    return (
        <div className="px-4 py-6">
            <Heading title="Products" description="Manage products across branches" />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                {/* Sidebar */}
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className={cn('w-full justify-start', {
                                'bg-muted': currentPath === '/products',
                            })}
                        >
                            <Link href="/products" prefetch>All Products</Link>
                        </Button>
                        {branches.map((branch) => (
                            <Button
                                key={branch.id}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath.includes(`branch_id=${branch.id}`),
                                })}
                            >
                                <Link href={`/products?branch_id=${branch.id}`} prefetch>
                                    {branch.branch_name}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                {/* Separator for larger screens */}
                <Separator className="my-6 md:hidden" />

                {/* Main Content */}
                <div className="flex-1 w-full lg:max-w-4xl xl:max-w-6xl">
                    <section className="shadow-md rounded-lg p-6 w-full min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
