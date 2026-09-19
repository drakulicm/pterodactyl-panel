import { tags } from '@lezer/highlight';
import { createTheme } from '@uiw/codemirror-themes';

import type { ResolvedMode } from '@/lib/theme';

const createEditorTheme = (mode: ResolvedMode) =>
    createTheme({
        theme: mode,
        settings: {
            background: 'var(--card)',
            foreground: 'var(--foreground)',
            caret: 'var(--primary)',
            selection: 'var(--accent)',
            selectionMatch: 'var(--terminal-match)',
            lineHighlight: 'var(--muted)',
            gutterBackground: 'var(--card)',
            gutterForeground: 'var(--muted-foreground)',
            gutterActiveForeground: 'var(--foreground)',
            gutterBorder: 'transparent',
        },
        styles: [
            { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--muted-foreground)' },
            { tag: [tags.meta, tags.processingInstruction], color: 'var(--muted-foreground)' },
            { tag: [tags.punctuation, tags.separator, tags.bracket], color: 'var(--muted-foreground)' },
            { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: 'var(--terminal-ansi-magenta)' },
            { tag: [tags.atom, tags.bool, tags.null, tags.number], color: 'var(--terminal-ansi-yellow)' },
            { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--terminal-ansi-green)' },
            { tag: [tags.operator, tags.escape], color: 'var(--terminal-ansi-cyan)' },
            { tag: [tags.propertyName, tags.attributeName], color: 'var(--terminal-ansi-blue)' },
            { tag: [tags.function(tags.variableName), tags.labelName], color: 'var(--terminal-ansi-blue)' },
            { tag: [tags.className, tags.typeName, tags.namespace], color: 'var(--terminal-ansi-cyan)' },
            { tag: [tags.tagName, tags.angleBracket], color: 'var(--terminal-ansi-red)' },
            { tag: [tags.heading, tags.strong], color: 'var(--terminal-ansi-blue)', fontWeight: 'bold' },
            { tag: [tags.link, tags.url], color: 'var(--terminal-ansi-cyan)', textDecoration: 'underline' },
            { tag: tags.invalid, color: 'var(--destructive)' },
        ],
    });

const EDITOR_THEMES = {
    light: createEditorTheme('light'),
    dark: createEditorTheme('dark'),
};

export { EDITOR_THEMES };
