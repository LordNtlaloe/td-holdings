import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';

interface ProductCardProps {
    product: Product;
    onAddToCart: () => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
    return (
        <Card className="bg-[#1D1D1D] 
      w-[200px] sm:w-[250px] md:w-[250px] lg:w-full 
      max-[1024px]:w-[180px]">

            <CardContent>
                <div className="font-bold text-white text-sm sm:text-base md:text-lg">{product.product_name}</div>
                <span className="text-xs sm:text-sm text-gray-400">{product.product_category}</span>

                <div className="flex justify-between items-center mt-2 gap-2">
                    <span className="font-bold text-sm sm:text-base text-slate-100">
                        M{product.product_price.toFixed(2)}
                    </span>
                    <span className={`text-xs sm:text-sm ${product.product_quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        Stock: {product.product_quantity}
                    </span>
                </div>

                <Button
                    onClick={onAddToCart}
                    className="mt-2 w-full cursor-pointer"
                    disabled={product.product_quantity <= 0}
                >
                    Add
                </Button>
            </CardContent>
        </Card>
    );
}
