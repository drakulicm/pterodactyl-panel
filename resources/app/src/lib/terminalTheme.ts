import type { ISearchOptions } from '@xterm/addon-search';
import type { ITheme } from '@xterm/xterm';

const readToken = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const getTerminalTheme = (): ITheme => ({
    background: '#00000000',
    foreground: readToken('--terminal-foreground'),
    cursor: 'transparent',
    black: readToken('--terminal-ansi-black'),
    red: readToken('--terminal-ansi-red'),
    green: readToken('--terminal-ansi-green'),
    yellow: readToken('--terminal-ansi-yellow'),
    blue: readToken('--terminal-ansi-blue'),
    magenta: readToken('--terminal-ansi-magenta'),
    cyan: readToken('--terminal-ansi-cyan'),
    white: readToken('--terminal-ansi-white'),
    brightBlack: readToken('--terminal-ansi-bright-black'),
    brightRed: readToken('--terminal-ansi-bright-red'),
    brightGreen: readToken('--terminal-ansi-bright-green'),
    brightYellow: readToken('--terminal-ansi-bright-yellow'),
    brightBlue: readToken('--terminal-ansi-bright-blue'),
    brightMagenta: readToken('--terminal-ansi-bright-magenta'),
    brightCyan: readToken('--terminal-ansi-bright-cyan'),
    brightWhite: readToken('--terminal-ansi-bright-white'),
    selectionBackground: readToken('--terminal-selection'),
});

const getSearchDecorations = (): ISearchOptions => ({
    decorations: {
        matchBackground: readToken('--terminal-match'),
        matchOverviewRuler: readToken('--terminal-ansi-bright-black'),
        activeMatchBackground: readToken('--terminal-match-active'),
        activeMatchColorOverviewRuler: readToken('--terminal-ansi-bright-yellow'),
    },
});

export { getSearchDecorations, getTerminalTheme };
