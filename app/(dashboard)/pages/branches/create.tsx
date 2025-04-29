import { Head, useForm, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import BranchesLayout from '@/layouts/branches/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InputError from '@/components/general/input-error';
import { Label } from '@/components/ui/label'; // Update Label import
import { InfoIcon, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Heading from '@/components/general/heading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Branches',
    href: '/branches',
  },
];

type CreateBranchForm = {
  branch_name: string;
  branch_location: string;
};

const lesothoDistricts = [
  'Berea',
  'Butha-Buthe',
  'Leribe',
  'Mafeteng',
  'Maseru',
  'Mohale\'s Hoek',
  'Mokhotlong',
  'Qacha\'s Nek',
  'Quthing',
  'Thaba-Tseka',
];

export default function Branches() {
  const { data, setData, post, processing, errors, reset } = useForm<Required<CreateBranchForm>>({
    branch_name: '',
    branch_location: '',
  });

  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('branches.store'), {
      onFinish: () => reset('branch_name', 'branch_location'),
      onSuccess: () => setAlert({ message: 'Branch created successfully!', type: 'success' }),
      onError: () => setAlert({ message: 'Failed to create branch.', type: 'error' }),
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Branches" />
      <BranchesLayout>
        <div className="space-y-6">
          <Heading title={'Create New Branch'} />
          <form className="flex flex-col gap-6 border p-5 rounded-md" onSubmit={submit}>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor='branch_name'>Branch Name</Label>
                <Input
                  id="branch_name"
                  type="text"
                  autoFocus
                  tabIndex={1}
                  autoComplete="branch_name"
                  value={data.branch_name}
                  onChange={(e) => setData('branch_name', e.target.value)}
                  disabled={processing}
                  placeholder="Branch Name"
                />
                <InputError message={errors.branch_name} className="mt-2" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor='location'>Location</Label>
                <Select
                  value={data.branch_location}
                  onValueChange={(value) => setData('branch_location', value)}
                  disabled={processing}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent>
                    {lesothoDistricts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <InputError message={errors.branch_location} />
              </div>

              <div className="flex justify-between">
                <Button type="submit" className="mt-2 w-[100px] cursor-pointer" tabIndex={5} disabled={processing}>
                  {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
                <Link href={route('branches.index')}>
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
          <Alert className={`h-15 w-96 fixed bottom-4 right-4 p-4 rounded-md shadow-lg ${alert.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle className='pb-2'>{alert.type}</AlertTitle>
            <AlertDescription className='text-white pb-4'>
              {alert.message}
            </AlertDescription>
          </Alert>
        )}
      </BranchesLayout>
    </AppLayout>
  );
}
