import '@xterm/xterm/css/xterm.css';

import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import { ChevronRightIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useServer } from '@/hooks/useServer';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { hasPermission } from '@/lib/permissions';
import { SocketEvent, SocketRequest } from '@/lib/socketEvents';
import { useServerStore } from '@/stores/serverStore';

const ESCAPE = String.fromCharCode(27);
const RESET = `${ESCAPE}[0m`;
const TERMINAL_PRELUDE = `${ESCAPE}[1m${ESCAPE}[33mcontainer@pterodactyl~ ${RESET}`;
const ERROR_STYLE = `${ESCAPE}[1m${ESCAPE}[41m`;
const HISTORY_LIMIT = 32;

const TERMINAL_THEME = {
    background: '#0a0a0a',
    cursor: 'transparent',
    black: '#0a0a0a',
    red: '#f87171',
    green: '#4ade80',
    yellow: '#facc15',
    blue: '#60a5fa',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: '#d4d4d4',
    brightBlack: '#737373',
    brightRed: '#fca5a5',
    brightGreen: '#86efac',
    brightYellow: '#fde047',
    brightBlue: '#93c5fd',
    brightMagenta: '#d8b4fe',
    brightCyan: '#67e8f9',
    brightWhite: '#fafafa',
    selectionBackground: '#fafafa33',
};

const ServerConsole: React.FC = () => {
    const { server, permissions } = useServer();
    const socket = useServerStore((state) => state.socket);
    const isConnected = useServerStore((state) => state.isConnected);
    const container = useRef<HTMLDivElement>(null);
    const terminal = useRef<Terminal | null>(null);
    const [history, setHistory] = usePersistedState<string[]>(`${server.id}:command_history`, []);
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
            theme: TERMINAL_THEME,
        });
        const fitAddon = new FitAddon();

        instance.loadAddon(fitAddon);
        instance.loadAddon(new SearchAddon());
        instance.loadAddon(new WebLinksAddon());
        instance.loadAddon(new Unicode11Addon());
        instance.unicode.activeVersion = '11';
        instance.open(element);
        fitAddon.fit();

        instance.attachCustomKeyEventHandler((event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                navigator.clipboard.writeText(instance.getSelection());

                return false;
            }

            return true;
        });

        const observer = new ResizeObserver(() => fitAddon.fit());
        observer.observe(element);
        terminal.current = instance;

        return () => {
            observer.disconnect();
            instance.dispose();
            terminal.current = null;
        };
    }, []);

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
        <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-[#0a0a0a]'>
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
