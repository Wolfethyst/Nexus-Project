import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeName = 'default' | 'light' | 'dark' | 'oled';
export type ColorStyle = 'purple' | 'blue' | 'green' | 'red';

interface ThemeState {
  theme: ThemeName;
  colorStyle: ColorStyle;
  setTheme: (theme: ThemeName) => void;
  setColorStyle: (color: ColorStyle) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'default',
      colorStyle: 'purple',
      setTheme: (theme) => set({ theme }),
      setColorStyle: (color) => set({ colorStyle: color }),
    }),
    {
      name: 'nexus-theme-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);