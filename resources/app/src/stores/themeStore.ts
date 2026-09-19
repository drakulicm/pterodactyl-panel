import { create } from 'zustand';

import { applyTheme, getStoredTheme, storeTheme, type Theme } from '@/lib/theme';

interface ThemeStore {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const useThemeStore = create<ThemeStore>((set) => ({
    theme: getStoredTheme(),
    setTheme: (theme) => {
        storeTheme(theme);
        applyTheme(theme);
        set({ theme });
    },
}));

export { useThemeStore };
