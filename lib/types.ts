export type Product = {
  id: number;
  product_name: string;
  product_price: number;
  product_quantity: number;
  product_category: string;
  product_commodity: string;
  product_grade: string;
  branch: {
    branch_location: string;
    branch_name: string;
  };
  branch_id: number;
};

export interface CartItem {
  discount: number;
  id: number;
  product: Product;
  quantity: number;
}

export interface Receipt {
  id: string;
  date: Date;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  cashier: string;
  branch: string;
  paymentMethod: string;
  amountPaid: number;
  change: number;
}

export interface AuthUser {
  id: number;
  name: string;
  role: string;
  // Add other user properties as needed
}

export interface Employee {
  branch: {
    id: number;
    branch_name: string;
    branch_location: string;
  };
  // Add other employee properties as needed
}

export function calculateCartTotals(cart: CartItem[]) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.product_price * item.quantity,
    0
  );
  const totalDiscount = 0; // You can add discount logic here
  const total = subtotal - totalDiscount;
  return { subtotal, totalDiscount, total };
}