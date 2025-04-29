import { Head, useForm, Link, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import ProductsLayout from '@/layouts/products/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InputError from '@/components/general/input-error';
import { Label } from '@/components/ui/label';
import { InfoIcon, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Heading from '@/components/general/heading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Breadcrumb navigation
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/products' },
];

type Branch = {
    id: number;
    branch_name: string;
};

type CreateProductForm = {
    product_name: string;
    product_price: number | '';
    product_quantity: number | '';
    product_category: string;
    branch_id: number | '';
    product_commodity: string;
    product_grade: string;
};

const productCategories = ['Car Tyres', '4x4 Tyres', 'Truck Tyres'];


export default function CreateProduct() {
    const { branches } = usePage<{ branches: Branch[] }>().props; // Fetch branches from backend
    const { data, setData, post, processing, errors, reset } = useForm<CreateProductForm>({
        product_name: '',
        product_price: '',
        product_quantity: '',
        product_category: '',
        branch_id: '',
        product_commodity: '',
        product_grade: ''
    });

    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('products.store'), {
            onFinish: () => reset(),
            onSuccess: () => setAlert({ message: 'Product created successfully!', type: 'success' }),
            onError: () => setAlert({ message: 'Failed to create product.', type: 'error' }),
        });
    };

    useEffect(() => {
        if (alert) {
            const timeout = setTimeout(() => setAlert(null), 3000); // Hide alert after 3 seconds
            return () => clearTimeout(timeout);
        }
    }, [alert]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Product" />
            <ProductsLayout>
                <div className="space-y-6">
                    <Heading title="Create New Product" />
                    <form className="flex flex-col gap-6 border p-5 rounded-md" onSubmit={submit}>
                        <div className="grid gap-6">

                            {/* Product Name */}
                            <div className="grid gap-2">
                                <Label htmlFor="product_name">Product Name</Label>
                                <Input
                                    id="product_name"
                                    type="text"
                                    autoFocus
                                    tabIndex={1}
                                    value={data.product_name}
                                    onChange={(e) => setData('product_name', e.target.value)}
                                    disabled={processing}
                                    placeholder="Enter product name"
                                />
                                <InputError message={errors.product_name} />
                            </div>

                            {/* Product Price */}
                            <div className="grid gap-2">
                                <Label htmlFor="product_price">Product Price</Label>
                                <Input
                                    id="product_price"
                                    type="number"
                                    tabIndex={2}
                                    value={data.product_price}
                                    onChange={(e) => setData('product_price', Number(e.target.value) || '')}
                                    disabled={processing}
                                    placeholder="Enter price"
                                />
                                <InputError message={errors.product_price} />
                            </div>

                            {/* Product Quantity */}
                            <div className="grid gap-2">
                                <Label htmlFor="product_quantity">Product Quantity</Label>
                                <Input
                                    id="product_quantity"
                                    type="number"
                                    tabIndex={3}
                                    value={data.product_quantity}
                                    onChange={(e) => setData('product_quantity', Number(e.target.value) || '')}
                                    disabled={processing}
                                    placeholder="Enter quantity"
                                />
                                <InputError message={errors.product_quantity} />
                            </div>

                            {/* Product Category */}
                            <div className="grid gap-2">
                                <Label htmlFor='product_category'>Product Category</Label>
                                <Select value={data.product_category} onValueChange={(value) => setData('product_category', value)} disabled={processing}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productCategories.map((category) => (
                                            <SelectItem key={category} value={category}>
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.product_category} />
                            </div>

                            {/* Branch Selection (Dropdown) */}
                            <div className="grid gap-2">
                                <Label htmlFor="branch_id">Select Branch</Label>
                                <Select
                                    value={data.branch_id.toString()}
                                    onValueChange={(value) => setData('branch_id', Number(value))}
                                    disabled={processing}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                {branch.branch_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.branch_id} />
                            </div>
                            {/* Commodity Selection */}
                            <div className="grid gap-2">
                                <Label htmlFor="product_commodity">Commodity</Label>
                                <Select
                                    value={data.product_commodity}
                                    onValueChange={(value) => setData("product_commodity", value)}
                                    disabled={processing}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Commodity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="New Tyre">New Tyre</SelectItem>
                                        <SelectItem value="Used Tyre">Used Tyre</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.product_commodity} />
                            <div className="grid gap-2">
                            </div>

                            {/* Grade Selection */}
                                <Label htmlFor="product_grade">Grade</Label>
                                <Select
                                    value={data.product_grade}
                                    onValueChange={(value) => setData("product_grade", value)}
                                    disabled={processing}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A">A</SelectItem>
                                        <SelectItem value="B">B</SelectItem>
                                        <SelectItem value="C">C</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.product_grade} />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-between">
                                <Button type="submit" className="mt-2 w-[100px]" disabled={processing}>
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                    Save
                                </Button>
                                <Link href={route('products.index')}>
                                    <Button type="button" className="mt-2 w-[100px]">Back</Button>
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
            </ProductsLayout>
        </AppLayout>
    );
}
