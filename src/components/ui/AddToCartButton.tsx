"use client";

import { ShoppingCart } from "lucide-react";
import { useCartStore, CartItem } from "@/store/cartStore";
import { useCartOwnerBinding } from "@/lib/useCartOwnerBinding";

export function AddToCartButton({
  product,
  ownerKey,
}: {
  product: CartItem;
  ownerKey: string | null;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const { cartOwnerReady } = useCartOwnerBinding({
    identityKey: ownerKey,
    resolved: true,
  });

  const handleAddToCart = () => {
    if (!cartOwnerReady || !ownerKey) return;
    addItem({ ...product, quantity: 1 });
  };

  return (
    <button 
      onClick={handleAddToCart}
      disabled={!cartOwnerReady || !ownerKey}
      className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground w-full py-2 px-4 rounded-md font-semibold hover:bg-primary/90 transition shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ShoppingCart className="w-4 h-4" />
      Dodaj do koszyka
    </button>
  );
}
