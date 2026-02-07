import { create } from 'zustand';
import type { Session } from '@nexus/shared';
import { ApiClient } from '../lib/api';

interface AuthStore {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  isLoading: false,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: async () => {
    try {
      await ApiClient.post('/auth/logout', {});
      set({ session: null });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },
}));
