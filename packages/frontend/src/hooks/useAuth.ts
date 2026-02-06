import { useEffect, useState } from 'react';
import type { Session } from '@nexus/shared';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../store';

export function useAuth() {
  const { session, setSession, setLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const response = await ApiClient.get<Session>('/auth/session');
        if (response.ok && response.data) {
          setSession(response.data);
        } else {
          setSession(null);
        }
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    })();
  }, [setSession, setLoading]);

  return { session, isInitialized };
}

export function useIsModOrOwner() {
  const { session } = useAuthStore();
  return {
    isOwner: session?.roles?.includes('owner') ?? false,
    isMod: session?.roles?.includes('mod') ?? false,
    isModOrOwner: session?.roles?.includes('owner') ?? session?.roles?.includes('mod') ?? false,
  };
}
