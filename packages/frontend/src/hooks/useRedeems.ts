import { useCallback, useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';

export interface RedeemItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  type: 'redeem';
  soundKey?: string;
  imageKey?: string;
}

export function useRedeems() {
  const [items, setItems] = useState<RedeemItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ redeems: RedeemItem[] }>('/store/redeems');
      setItems(response.data?.redeems || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch redeems');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const purchase = useCallback(async (itemId: string) => {
    try {
      const response = await ApiClient.post<{ ok: boolean; soundFile?: string; remainingPoints?: number; error?: string }>('/redeems/redeem', { redeemId: itemId });
      return {
        ok: response.data?.ok,
        pointsAfter: response.data?.remainingPoints,
        soundFile: response.data?.soundFile,
        error: response.data?.error
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }, []);

  return { items, loading, error, fetchItems, purchase };
}
