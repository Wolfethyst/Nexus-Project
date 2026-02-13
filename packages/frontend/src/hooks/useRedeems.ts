import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

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
  const { user, refreshSession } = useAuth();
  const [redeems, setRedeems] = useState<Redeem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRedeems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/redeems/list`);
      const data = await res.json();
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
      const res = await fetch(`${API_BASE}/redeems/redeem`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ redeemId }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        // Play sound if returned
        if (data.soundFile) {
          const audio = new Audio(`${API_BASE}/sounds/${data.soundFile}`);
          audio.volume = 0.5;
          audio.play().catch(e => console.error('Audio play failed:', e));
        }
        if (refreshSession) refreshSession();
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
      const res = await fetch(`${API_BASE}/redeems/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.ok) {
        if (refreshSession) refreshSession();
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
