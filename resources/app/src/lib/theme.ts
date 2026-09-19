type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

// Kept in sync with the inline no-flash script in resources/views/templates/app.blade.php.
const THEME_STORAGE_KEY = 'pterodactyl:theme';

const THEMES = ['light', 'dark', 'system'] as const satisfies readonly Theme[];

const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

const prefersDark = (): boolean => window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveTheme = (theme: Theme): ResolvedTheme => (theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme);

const getStoredTheme = (): Theme => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);

    return isTheme(stored) ? stored : 'system';
};

const storeTheme = (theme: Theme): void => localStorage.setItem(THEME_STORAGE_KEY, theme);

const applyTheme = (theme: Theme): void => {
    const resolved = resolveTheme(theme);

    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
};

/** Keeps the document in sync with the OS while the stored preference is `system`. */
const watchSystemTheme = (): void => {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getStoredTheme() === 'system') {
            applyTheme('system');
        }
    });
};

export { applyTheme, getStoredTheme, resolveTheme, storeTheme, THEMES, watchSystemTheme };
export type { ResolvedTheme, Theme };
