import { create } from 'zustand';

import {
    applyTheme,
    getStoredMode,
    getStoredTheme,
    type ResolvedMode,
    resolveMode,
    storeMode,
    storeTheme,
    type ThemeId,
    type ThemeMode,
} from '@/lib/theme';

interface ThemeStore {
    theme: ThemeId;
    mode: ThemeMode;
    resolvedMode: ResolvedMode;
    setTheme: (theme: ThemeId) => void;
    setMode: (mode: ThemeMode) => void;
    setResolvedMode: (resolvedMode: ResolvedMode) => void;
}

const useThemeStore = create<ThemeStore>((set, get) => ({
    theme: getStoredTheme(),
    mode: getStoredMode(),
    resolvedMode: resolveMode(getStoredMode()),
    setTheme: (theme) => {
        storeTheme(theme);
        applyTheme(theme, get().mode);
        set({ theme });
    },
    setMode: (mode) => {
        storeMode(mode);
        applyTheme(get().theme, mode);
        set({ mode, resolvedMode: resolveMode(mode) });
    },
    setResolvedMode: (resolvedMode) => set({ resolvedMode }),
}));

export { useThemeStore };
