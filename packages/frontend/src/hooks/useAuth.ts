import { useEffect, useState } from 'react';
import type { Session } from '@nexus/shared';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../store';

export function useAuth() {
  const { session, setSession, setLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        console.log('[useAuth] Fetching session...');
        const response = await ApiClient.get<Session>('/auth/session');
        console.log('[useAuth] Session response:', response);
        if (response.ok && response.data) {
          console.log('[useAuth] Session found:', response.data);
          setSession(response.data);
        } else {
          console.log('[useAuth] No session found');
          setSession(null);
          setAuthError('No session found. Please log in.');
        }
      } catch (error: any) {
        console.error('[useAuth] Error fetching session:', error);
        setSession(null);
        setAuthError(error?.message || 'Failed to fetch session.');
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    })();
  }, [setSession, setLoading]);

  return { 
    session, 
    isInitialized,
    isOwner: session?.roles?.includes('owner') ?? false,
    isMod: session?.roles?.includes('mod') ?? false,
  };
}

export function useIsModOrOwner() {
  const { session } = useAuthStore();
  return {
    isOwner: session?.roles?.includes('owner') ?? false,
    isMod: session?.roles?.includes('mod') ?? false,
    isModOrOwner: session?.roles?.includes('owner') ?? session?.roles?.includes('mod') ?? false,
  };
}
