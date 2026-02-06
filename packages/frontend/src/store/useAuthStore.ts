import { create } from 'zustand';
import type { Session, User } from '@nexus/shared';

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
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      set({ session: null });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },
}));
