import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import InputError from '@/components/general/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import EmployeesLayout from '@/layouts/employees/layout';
import { BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';

type CreateEmployeeForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    branch_id: string;
    user_id: string;
    creation_method: 'new' | 'existing';
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Employees', href: '/employees' },
    { title: 'Add Employee', href: '/employees/create' },
];

interface Branch {
    id: number;
    branch_name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

type ExistingEmployeeForm = {
    user_id: string;
    branch_id: string;
    creation_method: 'existing';
};



export default function CreateEmployee({ branches = [], users = [] }: { branches: Branch[]; users: User[] }) {
    const [creationMethod, setCreationMethod] = useState<'new' | 'existing'>('new');

    // Create separate forms for each creation method
    const newUserForm = useForm<CreateEmployeeForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        branch_id: '',
        user_id: '',
        creation_method: 'new',
    });
    
    const existingUserForm = useForm<ExistingEmployeeForm>({
        user_id: '',
        branch_id: '',
        creation_method: 'existing',
    });

    const handleUserSelect = (userId: string) => {
        const selectedUser = users.find(user => user.id.toString() === userId);
        if (selectedUser) {
            existingUserForm.setData('user_id', userId);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (creationMethod === 'existing') {
            // Only submit user_id and branch_id for existing user
            existingUserForm.post(route('employees.store'));
        } else {
            // Submit full form for new user
            newUserForm.post(route('employees.store'), {
                onFinish: () => {
                    newUserForm.reset('password', 'password_confirmation');
                }
            });
        }
    };

    // Show processing state based on which form is active
    const isProcessing = creationMethod === 'new' ? newUserForm.processing : existingUserForm.processing;

    // Get errors based on which form is active
    const activeErrors = creationMethod === 'new' ? newUserForm.errors : existingUserForm.errors;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create A New Employee" />
            <EmployeesLayout>
                <div className="space-y-6">
                    <form className="flex flex-col gap-6 border p-5 rounded-md" onSubmit={submit}>
                        <div className="grid gap-6">
                            {/* Creation Method Selection */}
                            <div className="grid gap-4">
                                <Label>Creation Method</Label>
                                <RadioGroup
                                    value={creationMethod}
                                    className="flex gap-4"
                                    onValueChange={(value: 'new' | 'existing') => {
                                        setCreationMethod(value);
                                    }}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="new" id="new" />
                                        <Label htmlFor="new">Create New User</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="existing" id="existing" />
                                        <Label htmlFor="existing">Use Existing User</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* EXISTING USER FORM FIELDS */}
                            {creationMethod === 'existing' && (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="user_id">Select User</Label>
                                        <Select
                                            value={existingUserForm.data.user_id}
                                            onValueChange={handleUserSelect}
                                            disabled={existingUserForm.processing}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a user" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.length > 0 ? (
                                                    users.map(user => (
                                                        <SelectItem key={user.id} value={user.id.toString()}>
                                                            {user.name} ({user.email})
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="" disabled>
                                                        No available users found
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={activeErrors.user_id} />
                                    </div>

                                    {/* Branch Selection for Existing User */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="branch_id">Branch</Label>
                                        <Select
                                            value={existingUserForm.data.branch_id}
                                            onValueChange={(value: string) => existingUserForm.setData('branch_id', value)}
                                            disabled={existingUserForm.processing}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branches.map(branch => (
                                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                                        {branch.branch_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={activeErrors.branch_id} />
                                    </div>
                                </>
                            )}

                            {/* NEW USER FORM FIELDS */}
                            {creationMethod === 'new' && (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="name"
                                            value={newUserForm.data.name}
                                            onChange={(e) => newUserForm.setData('name', e.target.value)}
                                            disabled={newUserForm.processing}
                                            placeholder="Full name"
                                        />
                                        <InputError message={activeErrors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            tabIndex={2}
                                            autoComplete="email"
                                            value={newUserForm.data.email}
                                            onChange={(e) => newUserForm.setData('email', e.target.value)}
                                            disabled={newUserForm.processing}
                                            placeholder="email@example.com"
                                        />
                                        <InputError message={activeErrors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            tabIndex={3}
                                            autoComplete="new-password"
                                            value={newUserForm.data.password}
                                            onChange={(e) => newUserForm.setData('password', e.target.value)}
                                            disabled={newUserForm.processing}
                                            placeholder="Password"
                                        />
                                        <InputError message={activeErrors.password} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation">Confirm password</Label>
                                        <Input
                                            id="password_confirmation"
                                            type="password"
                                            required
                                            tabIndex={4}
                                            autoComplete="new-password"
                                            value={newUserForm.data.password_confirmation}
                                            onChange={(e) => newUserForm.setData('password_confirmation', e.target.value)}
                                            disabled={newUserForm.processing}
                                            placeholder="Confirm password"
                                        />
                                        <InputError message={activeErrors.password_confirmation} />
                                    </div>

                                    {/* Branch Selection for New User */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="branch_id">Branch</Label>
                                        <Select
                                            value={newUserForm.data.branch_id}
                                            onValueChange={(value: string) => newUserForm.setData('branch_id', value)}
                                            disabled={newUserForm.processing}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branches.map(branch => (
                                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                                        {branch.branch_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={activeErrors.branch_id} />
                                    </div>
                                </>
                            )}

                            <Button type="submit" className="mt-2 w-full" tabIndex={5} disabled={isProcessing}>
                                {isProcessing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                {creationMethod === 'new' ? 'Create Employee' : 'Assign as Employee'}
                            </Button>
                        </div>
                    </form>
                </div>
            </EmployeesLayout>
        </AppLayout>
    );
}