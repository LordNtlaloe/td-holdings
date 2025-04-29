import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PenIcon, InfoIcon, Trash2Icon } from "lucide-react";
import { useState, useEffect } from 'react';
import UsersLayout from '@/layouts/users/layout';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Users', href: '/users' },
];

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function Users() {
  const { users } = usePage<{ users: User[] }>().props;
  const { success, error } = usePage<{ success?: string; error?: string }>().props; // Fix: Renamed error to _error
  const { delete: destroy } = useForm();
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Delete branch using Inertia's useForm
  const deleteBranch = async (id: number) => {
    try {
      destroy(route('users.destroy', id), {
        onFinish: () => {
          setAlert({ message: 'Branch deleted successfully!', type: 'success' });
        },
        onError: () => {
          setAlert({ message: 'Failed to delete branch.', type: 'error' });
        }
      });
    } catch (error) {
      setAlert({ message: 'An error occurred' +  error, type: 'error' });
    }
  };

  useEffect(() => {
    if (success) {
        setAlert({ message: "Success", type: 'success' });
    }
    if (error) { // Fix: Using renamed variable _error
        setAlert({ message: error, type: 'error' });
    }
  }, [success, error]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Users" />

      <UsersLayout>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Input className="w-1/4" placeholder="Search" />
            <Link href={route('users.create')} className="cursor-pointer">
              <Button className="cursor-pointer" variant="secondary">Add New Branch</Button>
            </Link>
          </div>

          <Table className="border px-5 rounded-md">
            <TableCaption>A list of all users.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(({ id, name, email, role }) => (
                <TableRow key={id}>
                  <TableCell className="font-medium">{id}</TableCell>
                  <TableCell>{name}</TableCell>
                  <TableCell>{email}</TableCell>
                  <TableCell>{role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline">
                        <Link href={route('users.edit', id)} className="cursor-pointer flex gap-2 justify-end">
                          <PenIcon className="h-4 w-4 mr-1" /> Edit
                        </Link>
                      </Button>
                      <Button variant="destructive" onClick={() => deleteBranch(id)}>
                        <Trash2Icon className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total Users</TableCell>
                <TableCell className="text-right">{users.length}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
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
      </UsersLayout>
    </AppLayout>
  );
}
