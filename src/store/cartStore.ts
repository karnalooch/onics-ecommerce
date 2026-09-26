import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { shouldResetCartForOwner } from '@/lib/cartIdentity';
import {
  CART_ITEM_QUANTITY_MAX,
  isValidCartItemQuantity,
  resolveMergedCartQuantity,
} from '@/lib/cartQuantity';

export interface CartItem {
  id: string; // Unikalne ID produktu
  sku: string;
  name: string;
  price: number; // Ostatnia cena wyświetlana; transakcje i preview przeliczają ją na serwerze
  quantity: number;
}

interface CartStore {
  ownerKey: string | null;
  items: CartItem[];
  addItem: (item: CartItem) => boolean;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  replaceItems: (items: CartItem[]) => void;
  bindOwner: (ownerKey: string | null) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ownerKey: null,
      items: [],
      
      addItem: (item) => {
        if (!isValidCartItemQuantity(item.quantity)) return false;

        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === item.id);
        
        if (existingItem) {
          const nextQuantity = resolveMergedCartQuantity(
            existingItem.quantity,
            item.quantity
          );
          if (nextQuantity === null) return false;

          set({
            items: currentItems.map((i) =>
              i.id === item.id ? { ...i, quantity: nextQuantity } : i
            ),
          });
          return true;
        }

        set({ items: [...currentItems, item] });
        return true;
      },
      
      removeItem: (id) => {
        set({
          items: get().items.filter((i) => i.id !== id),
        });
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;

        const currentItems = get().items;
        const currentItem = currentItems.find((item) => item.id === id);
        if (!currentItem) return;

        let nextQuantity = quantity;
        if (!isValidCartItemQuantity(nextQuantity)) {
          if (
            currentItem.quantity > CART_ITEM_QUANTITY_MAX &&
            nextQuantity < currentItem.quantity
          ) {
            nextQuantity = CART_ITEM_QUANTITY_MAX;
          } else {
            return;
          }
        }

        set({
          items: currentItems.map((i) =>
            i.id === id ? { ...i, quantity: nextQuantity } : i
          ),
        });
      },

      replaceItems: (items) => set({ items }),

      bindOwner: (ownerKey) => {
        const nextOwnerKey = ownerKey?.trim() || null;
        const current = get();

        if (
          shouldResetCartForOwner(
            current.ownerKey,
            nextOwnerKey,
            current.items.length > 0
          )
        ) {
          set({ ownerKey: nextOwnerKey, items: [] });
          return;
        }

        if (current.ownerKey !== nextOwnerKey) {
          set({ ownerKey: nextOwnerKey });
        }
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      
      getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'celtronics-cart-storage', // Klucz w localStorage
    }
  )
);
