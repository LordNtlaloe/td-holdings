import Heading from '@/components/general/heading';
import { type PropsWithChildren } from 'react';


export default function BranchesLayout({ children }: PropsWithChildren) {

    if (typeof window === 'undefined') {
        return null;
    }


    return (
        <div className="px-4 py-6">
            <Heading title="Branches" description="Manage Your Branches" />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <div className="flex-1 md:max-w-7xl">
                    <section className="max-100 space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
