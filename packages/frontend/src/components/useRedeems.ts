import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { ApiClient } from '../lib/api';

export interface Redeem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon?: string;
  sound_file?: string;
  cooldown_seconds?: number;
  enabled: boolean;
}

export function useRedeems() {
  const { session } = useAuthStore();
  const user = session?.user;
  const [redeems, setRedeems] = useState<Redeem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRedeems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ApiClient.get<{ ok: boolean; redeems: Redeem[] }>('/redeems/list');
      if (data.ok) {
        setRedeems(data.redeems);
      }
    } catch (err) {
      console.error('Failed to fetch redeems:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerRedeem = async (redeemId: string) => {
    if (!user) return { ok: false, error: 'Not logged in' };

    try {
      const data = await ApiClient.post<{ ok: boolean; soundFile?: string; remainingPoints?: number; error?: string }>('/redeems/redeem', { redeemId });
      
      if (data.ok) {
        // Play sound if returned
        if (data.soundFile) {
          const audio = new Audio(`${ApiClient.baseURL}/sounds/${data.soundFile}`);
          audio.volume = 0.5;
          audio.play().catch(e => console.error('Audio play failed:', e));
        }
        
        // TODO: Refresh user points in store if possible
        return { ok: true, pointsAfter: data.remainingPoints };
      } else {
        return { ok: false, error: data.error };
      }
    } catch (err) {
      return { ok: false, error: 'Network error' };
    }
  };

  const triggerTTS = async (message: string) => {
    if (!user) return { ok: false, error: 'Not logged in' };

    try {
      const data = await ApiClient.post<{ ok: boolean; remainingPoints?: number; error?: string }>('/redeems/tts', { message });
      
      if (data.ok) {
        // TODO: Refresh user points in store if possible
        return { ok: true, pointsAfter: data.remainingPoints };
      } else {
        return { ok: false, error: data.error };
      }
    } catch (err) {
      return { ok: false, error: 'Network error' };
    }
  };

  useEffect(() => {
    fetchRedeems();
  }, [fetchRedeems]);

  return {
    redeems,
    loading,
    error,
    triggerRedeem,
    triggerTTS,
    refreshRedeems: fetchRedeems
  };
}