import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import BranchesLayout from '@/layouts/branches/layout';
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

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Branches', href: '/branches' },
];

type Branch = {
  id: number;
  branch_name: string;
  branch_location: string;
};

type PageProps = {
  branches: Branch[];
  flash: {
    success?: string;
    error?: string;
  };
};

export default function Branches() {
  const { branches, flash } = usePage<PageProps>().props;
  const { delete: destroy } = useForm();
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Delete branch using Inertia's useForm
  const deleteBranch = (id: number) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      destroy(route('branches.destroy', id), {
        onSuccess: () => {
          // Success handling is done via the flash messages
        },
        onError: (error) => {
          setAlert({ message: `${error}, 'Failed to delete branch.'`, type: 'error' });
        }
      });
    }
  };

  useEffect(() => {
    // Process flash messages from Laravel
    if (flash?.success) {
      setAlert({ message: flash.success, type: "success" });
      
      // Auto-dismiss the alert after 5 seconds
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    
    if (flash?.error) {
      setAlert({ message: flash.error, type: "error" });
      
      // Auto-dismiss the alert after 5 seconds
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [flash]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Branches" />

      <BranchesLayout>
        <div className="space-y-4">
          <div className="flex justify-between">
            <Input className="w-1/4" placeholder="Search" />
            <Link href={route('branches.create')} className="cursor-pointer">
              <Button variant="secondary">Add New Branch</Button>
            </Link>
          </div>

          <Table className="border px-5 rounded-md">
            <TableCaption>A list of all branches.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.length > 0 ? (
                branches.map(({ id, branch_name, branch_location }) => (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{id}</TableCell>
                    <TableCell>{branch_name}</TableCell>
                    <TableCell>{branch_location}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline">
                          <Link href={route('branches.edit', id)} className="flex gap-2 items-center">
                            <PenIcon className="h-4 w-4" /> Edit
                          </Link>
                        </Button>
                        <Button variant="destructive" onClick={() => deleteBranch(id)}>
                          <Trash2Icon className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">No branches found</TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total Branches</TableCell>
                <TableCell className="text-right">{branches.length}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Alert Component */}
        {alert && (
          <div className="fixed bottom-4 right-4 z-50 animate-in fade-in">
            <Alert className={`w-96 shadow-lg ${
              alert.type === 'success' ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'
            }`}>
              <InfoIcon className={`h-4 w-4 ${alert.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
              <AlertTitle className={`${alert.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {alert.type === 'success' ? 'Success' : 'Error'}
              </AlertTitle>
              <AlertDescription className={`${alert.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {alert.message}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </BranchesLayout>
    </AppLayout>
  );
}