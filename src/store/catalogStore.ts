// src/store/catalogStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persistent Store for Catalog Management
 * Handles the Staging Buffer (Bufor) state to ensure persistence across navigation and tabs.
 */
interface CatalogStore {
  stagingPayload: any[];
  showStaging: boolean;
  
  // Actions
  setShowStaging: (show: boolean) => void;
  setStagingPayload: (payload: any[]) => void;
  updateStagingItem: (tempId: string, field: string, value: any) => void;
  removeStagingItem: (tempId: string) => void;
  clearStaging: () => void;
}

export const useCatalogStore = create<CatalogStore>()(
  persist(
    (set) => ({
      stagingPayload: [],
      showStaging: false,

      setShowStaging: (show) => set({ showStaging: show }),
      
      setStagingPayload: (payload) => set({ stagingPayload: payload }),

      updateStagingItem: (tempId, field, value) => set((state) => ({
        stagingPayload: state.stagingPayload.map((item) => 
          item.tempId === tempId ? { ...item, [field]: value } : item
        )
      })),

      removeStagingItem: (tempId) => set((state) => ({
        stagingPayload: state.stagingPayload.filter((item) => item.tempId !== tempId)
      })),

      clearStaging: () => set({ stagingPayload: [], showStaging: false }),
    }),
    {
      name: 'celtronics-catalog-buffer', // Persist in localStorage
      partialize: (state) => ({ stagingPayload: state.stagingPayload, showStaging: state.showStaging }),
    }
  )
);
