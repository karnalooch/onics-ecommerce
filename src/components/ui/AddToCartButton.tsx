"use client";

import { ShoppingCart } from "lucide-react";
import { useCartStore, CartItem } from "@/store/cartStore";

export function AddToCartButton({ product }: { product: CartItem }) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({ ...product, quantity: 1 });
  };

  return (
    <button 
      onClick={handleAddToCart}
      className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground w-full py-2 px-4 rounded-md font-semibold hover:bg-primary/90 transition shadow-sm active:scale-95"
    >
      <ShoppingCart className="w-4 h-4" />
      Dodaj do koszyka
    </button>
  );
}
