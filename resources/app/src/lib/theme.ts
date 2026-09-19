type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedMode = 'light' | 'dark';
type ThemeId = 'default' | 'tokyo-night' | 'catppuccin' | 'nord' | 'gruvbox' | 'rose-pine';

const MODE_STORAGE_KEY = 'pterodactyl:theme-mode';
const THEME_STORAGE_KEY = 'pterodactyl:theme';

const MODES = ['light', 'dark', 'system'] as const satisfies readonly ThemeMode[];

const THEMES = [
    { id: 'default', label: 'Default' },
    { id: 'tokyo-night', label: 'Tokyo Night' },
    { id: 'catppuccin', label: 'Catppuccin' },
    { id: 'nord', label: 'Nord' },
    { id: 'gruvbox', label: 'Gruvbox' },
    { id: 'rose-pine', label: 'Rosé Pine' },
] as const satisfies readonly { id: ThemeId; label: string }[];

const isMode = (value: unknown): value is ThemeMode => MODES.includes(value as ThemeMode);

const isTheme = (value: unknown): value is ThemeId => THEMES.some(({ id }) => id === value);

const prefersDark = (): boolean => window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveMode = (mode: ThemeMode): ResolvedMode => (mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode);

const getStoredMode = (): ThemeMode => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);

    return isMode(stored) ? stored : 'system';
};

const getStoredTheme = (): ThemeId => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);

    return isTheme(stored) ? stored : 'default';
};

const storeMode = (mode: ThemeMode): void => localStorage.setItem(MODE_STORAGE_KEY, mode);

const storeTheme = (theme: ThemeId): void => localStorage.setItem(THEME_STORAGE_KEY, theme);

const applyTheme = (theme: ThemeId, mode: ThemeMode): void => {
    const resolved = resolveMode(mode);

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
};

const watchSystemTheme = (onChange: (resolved: ResolvedMode) => void): void => {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getStoredMode() !== 'system') {
            return;
        }

        applyTheme(getStoredTheme(), 'system');
        onChange(resolveMode('system'));
    });
};

export {
    applyTheme,
    getStoredMode,
    getStoredTheme,
    MODES,
    resolveMode,
    storeMode,
    storeTheme,
    THEMES,
    watchSystemTheme,
};
export type { ResolvedMode, ThemeId, ThemeMode };
