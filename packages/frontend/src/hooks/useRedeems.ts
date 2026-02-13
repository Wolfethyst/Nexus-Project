import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store';
import { ApiClient } from '../lib/api';
import type { Session } from '@nexus/shared';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.wolfethyst.tv';

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
  const { session, setSession } = useAuthStore();
  const user = session?.user;
  const [redeems, setRedeems] = useState<Redeem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const response = await ApiClient.get<Session>('/auth/session');
      if (response.ok && response.data) {
        setSession(response.data);
      }
    } catch (e) {
      console.error('Failed to refresh session:', e);
    }
  }, [setSession]);

  const fetchRedeems = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await ApiClient.get<{ ok: boolean; redeems: Redeem[] }>('/redeems/list');
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
      const { data } = await ApiClient.post<{ ok: boolean; soundFile?: string; remainingPoints?: number; error?: string }>('/redeems/redeem', { redeemId });
      
      if (data.ok) {
        // Play sound if returned
        if (data.soundFile) {
          const audio = new Audio(`${ApiClient.baseURL}/sounds/${data.soundFile}`);
          audio.volume = 0.5;
          audio.play().catch(e => console.error('Audio play failed:', e));
        }
        
        refreshSession();
        return { ok: true, pointsAfter: data.remainingPoints };
      } else {
        return { ok: false, error: data.error };
      }
    } catch (err) {
      return { ok: false, error: 'Failed to redeem' };
    }
  };

  const triggerTTS = async (message: string) => {
    if (!user) return { ok: false, error: 'Not logged in' };
    try {
      const { data } = await ApiClient.post<{ ok: boolean; remainingPoints?: number; error?: string }>('/redeems/tts', { message });
      
      if (data.ok) {
        refreshSession();
        return { ok: true, pointsAfter: data.remainingPoints };
      } else {
        return { ok: false, error: data.error };
      }
    } catch (err) {
      return { ok: false, error: 'Failed to send TTS' };
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
  };
}
