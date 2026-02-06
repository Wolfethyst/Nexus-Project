import { create } from 'zustand';
import type { StoreItem, InventoryItem } from '@nexus/shared';

interface MarketStore {
  items: StoreItem[];
  inventory: InventoryItem[];
  isLoading: boolean;
  sortBy: 'price-asc' | 'price-desc' | 'new';
  
  setItems: (items: StoreItem[]) => void;
  setInventory: (inventory: InventoryItem[]) => void;
  setLoading: (loading: boolean) => void;
  setSortBy: (sort: 'price-asc' | 'price-desc' | 'new') => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  items: [],
  inventory: [],
  isLoading: false,
  sortBy: 'price-asc',
  
  setItems: (items) => set({ items }),
  setInventory: (inventory) => set({ inventory }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSortBy: (sort) => set({ sortBy: sort }),
}));
