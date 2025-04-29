import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem as CartItemType } from '@/lib/types';

interface CartItemProps {
    item: CartItemType;
    onIncrease: () => void;
    onDecrease: () => void;
    onRemove: () => void;
}

export default function CartItem({ item, onIncrease, onDecrease, onRemove }: CartItemProps) {
    return (
        <div className="flex justify-between items-center py-3 border-b">
            <div className="flex-1">
                <h3 className="font-medium">{item.product.product_name}</h3>
                <p className="text-sm text-gray-500">
                    M{item.product.product_price.toFixed(2)} × {item.quantity}
                </p>
            </div>

            <div className="flex items-center space-x-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDecrease}
                    className="h-8 w-8 p-0"
                >
                    <Minus className="h-4 w-4" />
                </Button>

                <span className="w-6 text-center">{item.quantity}</span>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onIncrease}
                    className="h-8 w-8 p-0"
                >
                    <Plus className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="h-8 w-8 p-0 text-red-500"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}