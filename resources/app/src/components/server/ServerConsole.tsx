import '@xterm/xterm/css/xterm.css';

import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { hasPermission } from '@/lib/permissions';
import { SocketEvent, SocketRequest } from '@/lib/socketEvents';
import { getSearchDecorations, getTerminalTheme } from '@/lib/terminalTheme';
import { useServerStore } from '@/stores/serverStore';
import { useThemeStore } from '@/stores/themeStore';

const ESCAPE = String.fromCharCode(27);
const RESET = `${ESCAPE}[0m`;
const TERMINAL_PRELUDE = `${ESCAPE}[1m${ESCAPE}[33mcontainer@pterodactyl~ ${RESET}`;
const ERROR_STYLE = `${ESCAPE}[1m${ESCAPE}[41m`;
const HISTORY_LIMIT = 32;

const ServerConsole: React.FC = () => {
    const { server, permissions } = useServer();
    const socket = useServerStore((state) => state.socket);
    const isConnected = useServerStore((state) => state.isConnected);
    const container = useRef<HTMLDivElement>(null);
    const terminal = useRef<Terminal | null>(null);
    const search = useRef<SearchAddon | null>(null);
    const searchInput = useRef<HTMLInputElement>(null);
    const commandInput = useRef<HTMLInputElement>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState({ resultIndex: -1, resultCount: 0 });
    const theme = useThemeStore((state) => state.theme);
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const historyKey = `${server.id}:command_history`;
    const [history, setHistory] = useState<string[]>(() => {
        try {
            const item = localStorage.getItem(historyKey);

            return item === null ? [] : (JSON.parse(item) as string[]);
        } catch {
            return [];
        }
    });
    const hasHistoryChanged = useRef(false);

    useEffect(() => {
        if (!hasHistoryChanged.current) {
            hasHistoryChanged.current = true;

            return;
        }

        localStorage.setItem(historyKey, JSON.stringify(history));
    }, [historyKey, history]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const canSendCommands = hasPermission(permissions, 'control.console');

    const writeLine = (line: string, withPrelude = false) => {
        const content = line.replace(/(?:\r\n|\r|\n)$/im, '');
        terminal.current?.writeln(`${withPrelude ? TERMINAL_PRELUDE : ''}${content}${RESET}`);
    };

    useEffect(() => {
        const element = container.current;
        if (!element) {
            return;
        }

        const instance = new Terminal({
            disableStdin: true,
            cursorStyle: 'underline',
            allowTransparency: true,
            allowProposedApi: true,
            fontSize: 12,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineHeight: 1.2,
            scrollback: 5000,
            theme: getTerminalTheme(),
        });
        const fitAddon = new FitAddon();
        const searchAddon = new SearchAddon();

        instance.loadAddon(fitAddon);
        instance.loadAddon(searchAddon);
        instance.loadAddon(new WebLinksAddon());
        instance.loadAddon(new Unicode11Addon());
        instance.unicode.activeVersion = '11';
        instance.open(element);
        fitAddon.fit();

        instance.attachCustomKeyEventHandler((event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                const selection = instance.getSelection();
                if (selection.length === 0) {
                    return true;
                }

                navigator.clipboard.writeText(selection);

                return false;
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                setIsSearchOpen(true);

                return false;
            }

            const input = commandInput.current;
            if (event.type === 'keydown' && input && !event.altKey && !event.ctrlKey && !event.metaKey && event.key.length === 1) {
                input.focus();
                input.value += event.key;

                return false;
            }

            return true;
        });

        searchAddon.onDidChangeResults(setSearchResults);

        const observer = new ResizeObserver(() => fitAddon.fit());
        observer.observe(element);
        terminal.current = instance;
        search.current = searchAddon;

        return () => {
            observer.disconnect();
            instance.dispose();
            terminal.current = null;
            search.current = null;
        };
    }, []);

    useEffect(() => {
        if (isSearchOpen) {
            searchInput.current?.focus();
            searchInput.current?.select();
        }
    }, [isSearchOpen]);

    useEffect(() => {
        if (terminal.current) {
            terminal.current.options.theme = getTerminalTheme();
        }
    }, [theme, resolvedMode]);

    useEffect(() => {
        if (!socket || !isConnected) {
            return;
        }

        if (!server.isTransferring) {
            terminal.current?.clear();
        }

        socket.send(SocketRequest.SEND_LOGS);
    }, [socket, isConnected, server.isTransferring]);

    useSocketEvent(SocketEvent.CONSOLE_OUTPUT, (line) => writeLine(line));
    useSocketEvent(SocketEvent.INSTALL_OUTPUT, (line) => writeLine(line));
    useSocketEvent(SocketEvent.TRANSFER_LOGS, (line) => writeLine(line));
    useSocketEvent(SocketEvent.DAEMON_MESSAGE, (line) => writeLine(line, true));
    useSocketEvent(SocketEvent.DAEMON_ERROR, (line) => writeLine(`${ERROR_STYLE}${line}`, true));
    useSocketEvent(SocketEvent.STATUS, (status) => writeLine(`Server marked as ${status}...`, true));
    useSocketEvent(SocketEvent.TRANSFER_STATUS, (status) => {
        if (status === 'failure') {
            writeLine('Transfer has failed.', true);
        }
    });

    const handleFind = (direction: 'next' | 'previous') => {
        const term = searchInput.current?.value ?? '';
        if (term.length === 0) {
            search.current?.clearDecorations();
            setSearchResults({ resultIndex: -1, resultCount: 0 });

            return;
        }

        const options = getSearchDecorations();
        if (direction === 'next') {
            search.current?.findNext(term, options);

            return;
        }

        search.current?.findPrevious(term, options);
    };

    const handleSearchClose = () => {
        search.current?.clearDecorations();
        setSearchResults({ resultIndex: -1, resultCount: 0 });
        setIsSearchOpen(false);
    };

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            handleSearchClose();

            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            handleFind(event.shiftKey ? 'previous' : 'next');
        }
    };

    const handleConsoleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            setIsSearchOpen(true);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            const next = Math.min(historyIndex + 1, history.length - 1);
            setHistoryIndex(next);
            event.currentTarget.value = history[next] ?? '';

            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const next = Math.max(historyIndex - 1, -1);
            setHistoryIndex(next);
            event.currentTarget.value = history[next] ?? '';

            return;
        }

        const command = event.currentTarget.value;
        if (event.key !== 'Enter' || command.length === 0) {
            return;
        }

        setHistory((previous) => [command, ...previous].slice(0, HISTORY_LIMIT));
        setHistoryIndex(-1);
        socket?.send(SocketRequest.SEND_COMMAND, command);
        event.currentTarget.value = '';
    };

    return (
        <div
            className='relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-terminal'
            onKeyDown={handleConsoleKeyDown}
        >
            {isSearchOpen && (
                <div className='absolute top-2 right-2 z-20 flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-lg'>
                    <SearchIcon className='ml-1 size-3.5 shrink-0 text-muted-foreground' />
                    <Input
                        ref={searchInput}
                        aria-label='Search the console output.'
                        placeholder='Find in console...'
                        autoCorrect='off'
                        autoCapitalize='none'
                        spellCheck={false}
                        className='h-7 w-40 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0 dark:bg-transparent sm:w-52'
                        onKeyDown={handleSearchKeyDown}
                        onChange={() => handleFind('next')}
                    />
                    <span className='w-16 shrink-0 text-center text-xs text-muted-foreground tabular-nums'>
                        {searchResults.resultCount > 0 ? `${searchResults.resultIndex + 1} of ${searchResults.resultCount}` : 'No results'}
                    </span>
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label='Previous match'
                        onClick={() => handleFind('previous')}
                    >
                        <ChevronUpIcon />
                    </Button>
                    <Button variant='ghost' size='icon-sm' aria-label='Next match' onClick={() => handleFind('next')}>
                        <ChevronDownIcon />
                    </Button>
                    <Button variant='ghost' size='icon-sm' aria-label='Close search' onClick={handleSearchClose}>
                        <XIcon />
                    </Button>
                </div>
            )}
            {!isConnected && (
                <div className='absolute inset-0 z-10 flex items-center justify-center bg-background/60'>
                    <Spinner className='size-6' />
                </div>
            )}
            <div ref={container} className='min-h-0 min-w-0 flex-1 overflow-hidden p-3 [&_.xterm-viewport]:!bg-transparent' />
            {canSendCommands && (
                <div className='flex items-center gap-2 border-t px-3'>
                    <ChevronRightIcon className='size-4 shrink-0 text-muted-foreground' />
                    <Input
                        ref={commandInput}
                        aria-label='Console command input.'
                        placeholder='Type a command...'
                        disabled={!socket || !isConnected}
                        autoCorrect='off'
                        autoCapitalize='none'
                        spellCheck={false}
                        className='h-10 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0 dark:bg-transparent'
                        onKeyDown={handleKeyDown}
                    />
                </div>
            )}
        </div>
    );
};

export { ServerConsole };
