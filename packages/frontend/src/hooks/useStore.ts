import { useCallback, useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';

export interface StoreItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  type: 'item' | 'redeem';
  soundKey?: string;
  imageKey?: string;
}

export interface UserInventoryItem extends StoreItem {
  equipped: boolean;
}

export function useStore() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ data: StoreItem[] }>('/store/list');
      setItems(response.data?.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch store items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const purchase = useCallback(async (itemId: string) => {
    try {
      const response = await ApiClient.post<{ pointsAfter: number; item: StoreItem }>('/store/purchase', { itemId });
      return { ok: response.ok, pointsAfter: response.data?.pointsAfter, item: response.data?.item };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, []);

  return { items, loading, error, fetchItems, purchase };
}

export function useInventory() {
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ inventory: UserInventoryItem[] }>('/store/inventory');
      setInventory(response.data?.inventory || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  const equip = useCallback(async (itemId: string) => {
    try {
      await ApiClient.post('/store/equip', { itemId });
      // Refresh inventory after equipping
      await fetchInventory();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, [fetchInventory]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return { inventory, loading, error, fetchInventory, equip };
}

export function useRedeems() {
  const [redeems, setRedeems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRedeems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ redeems: StoreItem[] }>('/store/redeems');
      setRedeems(response.data?.redeems || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch redeems');
    } finally {
      setLoading(false);
    }
  }, []);

  const redeem = useCallback(async (id: string, input?: string) => {
    try {
      const response = await ApiClient.post<{ pointsAfter: number; redeem: any }>('/store/redeems/redeem', { id, input });
      return { ok: response.ok, pointsAfter: response.data?.pointsAfter, redeem: response.data?.redeem };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchRedeems();
  }, [fetchRedeems]);

  return { redeems, loading, error, fetchRedeems, redeem };
}
