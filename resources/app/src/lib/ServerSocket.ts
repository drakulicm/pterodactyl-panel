import Sockette from 'sockette';

type Listener = (...args: string[]) => void;

const TERMINAL_CLOSE_CODES = [4409, 4400];

class ServerSocket {
    private socket: Sockette | null = null;
    private url: string | null = null;
    private token = '';
    private listeners = new Map<string, Set<Listener>>();

    connect = (url: string): this => {
        this.url = url;
        this.socket = new Sockette(url, {
            timeout: 1000,
            maxAttempts: 20,
            onmessage: (message) => {
                try {
                    const { event, args } = JSON.parse(message.data) as { event: string; args?: string[] };
                    this.emit(event, ...(args ?? []));
                } catch (error) {
                    console.warn('Failed to parse incoming websocket message.', error);
                }
            },
            onopen: () => {
                this.emit('SOCKET_OPEN');
                this.authenticate();
            },
            onreconnect: (event) => {
                if ('code' in event && TERMINAL_CLOSE_CODES.includes(event.code)) {
                    this.close(1000);
                    return;
                }

                this.emit('SOCKET_RECONNECT');
            },
            onclose: () => this.emit('SOCKET_CLOSE'),
            onerror: () => this.emit('SOCKET_ERROR'),
            onmaximum: () => this.emit('SOCKET_CONNECT_ERROR'),
        });

        return this;
    };

    setToken = (token: string, isUpdate = false): this => {
        this.token = token;
        if (isUpdate) {
            this.authenticate();
        }

        return this;
    };

    authenticate = (): void => {
        if (this.url && this.token) {
            this.send('auth', this.token);
        }
    };

    close = (code?: number, reason?: string): void => {
        this.url = null;
        this.token = '';
        this.socket?.close(code, reason);
    };

    send = (event: string, payload?: string | string[]): void => {
        this.socket?.json({ event, args: Array.isArray(payload) ? payload : [payload] });
    };

    on = (event: string, listener: Listener): (() => void) => {
        const listeners = this.listeners.get(event) ?? new Set<Listener>();
        listeners.add(listener);
        this.listeners.set(event, listeners);

        return () => listeners.delete(listener);
    };

    private emit = (event: string, ...args: string[]): void => {
        this.listeners.get(event)?.forEach((listener) => listener(...args));
    };
}

export { ServerSocket };
