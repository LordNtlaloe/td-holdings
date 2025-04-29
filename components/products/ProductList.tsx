import { useState } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProductCard from '@/components/products/ProductCard';
import ShoppingCart from '@/components/products/ShoppingCart';
import { AuthUser, Product } from '@/lib/types';
import { usePos } from '@/contexts/CartContext';

interface ProductListProps {
    products: Product[];
    branchName: string;
    user: AuthUser;
}

export default function ProductList({ products, branchName }: ProductListProps) {
    const { addToCart} = usePos();
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedCommodity, setSelectedCommodity] = useState("All");

    const filteredProducts = products.filter((product) => {
        const matchedCategory = selectedCategory === "All" || product.product_category === selectedCategory;
        const matchedCommodity = selectedCommodity === "All" || product.product_commodity === selectedCommodity;
        return matchedCategory && matchedCommodity;
    });

    return (
        <div className="flex flex-col lg:flex-row w-full gap-4 p-5">
            {/* Left Section - Product List (3/4 width) */}
            <div className="w-full lg:w-3/4">
                {/* Header */}
                <CardHeader>
                    <CardTitle className="text-xl font-bold">{branchName}</CardTitle>
                </CardHeader>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mt-5">
                    {/* Sidebar - Commodity Filter */}
                    <aside className="w-full md:w-1/4 lg:w-1/5">
                        <nav className="flex flex-row md:flex-col gap-2">
                            {["All", "New Tyre", "Used Tyre"].map((commodity) => (
                                <Badge
                                    key={commodity}
                                    onClick={() => setSelectedCommodity(commodity)}
                                    variant={selectedCommodity === commodity ? "default" : "outline"}
                                    className="cursor-pointer"
                                >
                                    {commodity}
                                </Badge>
                            ))}
                        </nav>
                    </aside>

                    <div className="w-full md:w-3/4">
                        <div className="flex-1 flex flex-wrap gap-2">
                            {["All", "Car Tyres", "4*4 Tyres", "Truck Tyres"].map((category) => (
                                <Badge
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    variant={selectedCategory === category ? "default" : "outline"}
                                    className="cursor-pointer"
                                >
                                    {category}
                                </Badge>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onAddToCart={() => addToCart(product)}
                                    />
                                ))
                            ) : (
                                <p className="text-center col-span-full text-gray-500">No products available</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Shopping Cart (1/4 width) */}
            <div className="w-full lg:w-1/4">
                <ShoppingCart />
            </div>
        </div>
    );
}
