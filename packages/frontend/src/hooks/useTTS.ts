import { useCallback, useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';

export interface TTSItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  type: 'item';
  soundKey?: string;
  imageKey?: string;
}

export function useTTS() {
  const [items, setItems] = useState<TTSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get<{ data: TTSItem[] }>('/tts/list');
      setItems(response.data?.data || []);
    } catch (err: any) => {
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
      const response = await ApiClient.post<{ pointsAfter: number; item: TTSItem }>('/tts/purchase', { itemId });
      return { ok: response.ok, pointsAfter: response.data?.pointsAfter, item: response.data?.item };
    } catch (err: any) => {
      return { ok: false, error: err.message };
    }
  }, []);

  return { items, loading, error, fetchItems, purchase };
}
