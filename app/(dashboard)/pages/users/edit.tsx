import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import BranchesLayout from '@/layouts/users/layout';
import { Button } from '@/components/ui/button';
import InputError from '@/components/general/input-error';
import { Label } from '@/components/ui/label'; // Update Label import
import { InfoIcon, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Heading from '@/components/general/heading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Edit User',
        href: '/users',
    },
];

// Define the User type
type User = {
    id: number;
    role: string;
};

type UpdateUserRoleForm = {
    role: string;
};

// Define the districts
const userRoles = [
    'Manager',
    'Cashier',
];

export default function Users() {
    // Change the type of `user` to be a single object, not an array
    const { user } = usePage<{ user: User }>().props;
    const { success, error } = usePage<{ success?: string; error?: string }>().props;
    const { data, setData, put, processing, errors, reset } = useForm<Required<UpdateUserRoleForm>>({
        role: user.role || '',
    });

    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('users.update', user.id), {
            onFinish: () => reset('role'),
            onSuccess: () => setAlert({ message: 'User updated successfully!', type: 'success' }),
            onError: () => setAlert({ message: 'Failed to update user.', type: 'error' }),
        });
    };

    useEffect(() => {
        if (success) {
            setAlert({ message: success, type: "success" });
        }
        else if (error) {
            setAlert({ message: error, type: "error" });
        }
    }, [success, error])

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit User Details" />
            <BranchesLayout>
                <Heading title={'Edit User Details'} />
                <div className="space-y-6">
                    <form className="flex flex-col gap-6 border p-5 rounded-md" onSubmit={submit}>
                        <div className="grid gap-6">


                            <div className="grid gap-2">
                                <Label htmlFor='role'>User Role</Label>
                                <Select
                                    value={data.role}
                                    onValueChange={(value) => setData('role', value)}
                                    disabled={processing}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userRoles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.role} />
                            </div>

                            <div className="flex justify-between">
                                <Button type="submit" className="mt-2 w-[100px] cursor-pointer" tabIndex={5} disabled={processing}>
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Save
                                </Button>
                                <Link href={route('users.index')}>
                                    <Button type="button" className="mt-2 w-[100px] cursor-pointer">
                                        Back
                                    </Button>
                                </Link>
                            </div>

                        </div>
                    </form>
                </div>

                {/* Alert Component */}
                {alert && (
                    <Alert className={`z-50 h-15 w-96 fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${alert.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle className='pb-2'>{alert.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
                        <AlertDescription className='text-white pb-4'>
                            {alert.message}
                        </AlertDescription>
                    </Alert>
                )}
            </BranchesLayout>
        </AppLayout>
    );
}
