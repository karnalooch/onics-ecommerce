import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // Unikalne ID produktu
  sku: string;
  name: string;
  price: number; // Ostatnia cena wyświetlana; transakcje i preview przeliczają ją na serwerze
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  replaceItems: (items: CartItem[]) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === item.id);
        
        if (existingItem) {
          set({
            items: currentItems.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
          });
        } else {
          set({ items: [...currentItems, item] });
        }
      },
      
      removeItem: (id) => {
        set({
          items: get().items.filter((i) => i.id !== id),
        });
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        });
      },

      replaceItems: (items) => set({ items }),
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      
      getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'celtronics-cart-storage', // Klucz w localStorage
    }
  )
);
