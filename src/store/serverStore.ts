// src/store/serverStore.ts
// Współdzielony stan serwerowy oparty na trwałym pliku JSON
import { readDb, writeDb } from "@/lib/jsonDb";

/**
 * Inicjalizuje i pobiera dane z trwałej bazy danych.
 * Wymuszamy przeładowanie z pliku, aby uniknąć problemów z cachem w pamięci RAM.
 */
export function initializeMockData() {
  const db = readDb();
  
  if (!db) {
    return {
      users: [],
      orders: [],
      repairs: [],
      categories: [],
      products: []
    };
  }

  // Wymuszamy nadpisanie globalnego stanu danymi z pliku
  // dzięki temu "usuwamy" stare mocki z pamięci RAM przy każdym przeładowaniu strony
  (global as any).mockUsersStore = db.users || [];
  (global as any).mockCategoriesStore = db.categories || [];
  (global as any).mockManufacturersStore = db.manufacturers || [];
  (global as any).mockProductsStore = db.products || [];
  (global as any).mockOrdersStore = db.orders || [];
  (global as any).mockRepairsStore = db.repairs || [];

  return {
    users: (global as any).mockUsersStore,
    orders: (global as any).mockOrdersStore,
    repairs: (global as any).mockRepairsStore,
    categories: (global as any).mockCategoriesStore,
    manufacturers: (global as any).mockManufacturersStore,
    products: (global as any).mockProductsStore
  };
}

/**
 * Zapisuje aktualny stan globalny do trwałego pliku JSON
 */
export function saveMockData() {
  const db = {
    users: (global as any).mockUsersStore || [],
    categories: (global as any).mockCategoriesStore || [],
    manufacturers: (global as any).mockManufacturersStore || [],
    products: (global as any).mockProductsStore || [],
    orders: (global as any).mockOrdersStore || [],
    repairs: (global as any).mockRepairsStore || []
  };

  return writeDb(db);
}
