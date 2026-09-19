import { create } from 'zustand';

import { applyTheme, getStoredTheme, type ResolvedTheme, resolveTheme, storeTheme, type Theme } from '@/lib/theme';

interface ThemeStore {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    setResolvedTheme: (resolvedTheme: ResolvedTheme) => void;
}

const useThemeStore = create<ThemeStore>((set) => ({
    theme: getStoredTheme(),
    resolvedTheme: resolveTheme(getStoredTheme()),
    setTheme: (theme) => {
        storeTheme(theme);
        applyTheme(theme);
        set({ theme, resolvedTheme: resolveTheme(theme) });
    },
    setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
}));

export { useThemeStore };
