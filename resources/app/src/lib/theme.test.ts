import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyTheme, getStoredMode, getStoredTheme, THEMES } from '@/lib/theme';

const stubStorage = (values: Record<string, string>) => {
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => values[key] ?? null,
        setItem: (key: string, value: string) => {
            values[key] = value;
        },
    });
};

const stubDocument = () => {
    const element = {
        dataset: {} as Record<string, string>,
        classList: new Set<string>(),
        style: {} as CSSStyleDeclaration,
    };

    vi.stubGlobal('document', {
        documentElement: {
            dataset: element.dataset,
            style: element.style,
            classList: {
                toggle: (name: string, force: boolean) =>
                    force ? element.classList.add(name) : element.classList.delete(name),
            },
        },
    });

    return element;
};

const stubPrefersDark = (matches: boolean) => vi.stubGlobal('window', { matchMedia: () => ({ matches }) });

afterEach(() => vi.unstubAllGlobals());

describe('getStoredTheme', () => {
    it('reads a known theme', () => {
        stubStorage({ 'pterodactyl:theme': 'tokyo-night' });

        expect(getStoredTheme()).toBe('tokyo-night');
    });

    it('falls back to the default theme for anything else', () => {
        stubStorage({ 'pterodactyl:theme': 'not-a-theme' });
        expect(getStoredTheme()).toBe('default');

        stubStorage({});
        expect(getStoredTheme()).toBe('default');
    });
});

describe('getStoredMode', () => {
    it('falls back to following the system', () => {
        stubStorage({ 'pterodactyl:theme-mode': 'dark' });
        expect(getStoredMode()).toBe('dark');

        stubStorage({ 'pterodactyl:theme-mode': 'tokyo-night' });
        expect(getStoredMode()).toBe('system');
    });
});

describe('applyTheme', () => {
    it('writes the theme and the resolved mode onto the document', () => {
        const element = stubDocument();
        stubPrefersDark(true);

        applyTheme('gruvbox', 'light');
        expect(element.dataset.theme).toBe('gruvbox');
        expect(element.classList.has('dark')).toBe(false);
        expect(element.style.colorScheme).toBe('light');

        applyTheme('gruvbox', 'system');
        expect(element.classList.has('dark')).toBe(true);
        expect(element.style.colorScheme).toBe('dark');
    });
});

describe('the pre-paint script', () => {
    const blade = readFileSync(path.resolve(import.meta.dirname, '../../../views/templates/app.blade.php'), 'utf8');

    it('knows every theme', () => {
        const ids = THEMES.map(({ id }) => `'${id}'`).join(', ');

        expect(blade).toContain(`var themes = [${ids}];`);
    });

    it('reads the same storage keys', () => {
        expect(blade).toContain("localStorage.getItem('pterodactyl:theme')");
        expect(blade).toContain("localStorage.getItem('pterodactyl:theme-mode')");
    });
});

describe('the stylesheet', () => {
    const css = readFileSync(path.resolve(import.meta.dirname, '../styles/themes.css'), 'utf8');

    it('defines both modes of every theme but the default', () => {
        for (const { id } of THEMES.filter(({ id }) => id !== 'default')) {
            expect(css).toContain(`:root[data-theme='${id}']:not(.dark) {`);
            expect(css).toContain(`:root[data-theme='${id}'].dark {`);
        }
    });
});
