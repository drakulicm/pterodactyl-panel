import { useEffect } from 'react';

import { getWebsocketToken } from '@/api/server/server';
import type { ServerPowerState } from '@/api/server/types';
import { ServerSocket } from '@/lib/ServerSocket';
import { SocketEvent } from '@/lib/socketEvents';
import { useServerStore } from '@/stores/serverStore';

const RECOVERABLE_JWT_ERRORS = ['jwt: exp claim is invalid', 'jwt: created too far in past (denylist)'];

const useServerSocket = (uuid: string | undefined): void => {
    useEffect(() => {
        if (!uuid) {
            return;
        }

        const { setSocket, setIsConnected, setSocketError, setPowerState, reset } = useServerStore.getState();
        let isDisposed = false;
        let isUpdatingToken = false;
        let active: ServerSocket | null = null;

        const updateToken = async (socket: ServerSocket) => {
            if (isUpdatingToken) {
                return;
            }

            isUpdatingToken = true;
            try {
                const data = await getWebsocketToken(uuid);
                socket.setToken(data.token, true);
            } catch (error) {
                console.error(error);
            } finally {
                isUpdatingToken = false;
            }
        };

        const connect = async () => {
            const socket = new ServerSocket();
            active = socket;

            socket.on('auth success', () => setIsConnected(true));
            socket.on('SOCKET_CLOSE', () => setIsConnected(false));
            socket.on('SOCKET_CONNECT_ERROR', () => setSocketError('failed'));
            socket.on('SOCKET_ERROR', () => {
                setSocketError('connecting');
                setIsConnected(false);
            });
            socket.on(SocketEvent.STATUS, (status) => setPowerState(status as ServerPowerState));
            socket.on(SocketEvent.DAEMON_ERROR, (message) => console.warn('Daemon socket error:', message));
            socket.on('token expiring', () => updateToken(socket));
            socket.on('token expired', () => updateToken(socket));
            socket.on('jwt error', (message) => {
                setIsConnected(false);
                if (RECOVERABLE_JWT_ERRORS.some((value) => message.toLowerCase().includes(value))) {
                    updateToken(socket);
                    return;
                }

                setSocketError('credentials');
            });
            socket.on(SocketEvent.TRANSFER_STATUS, (status) => {
                if (status === 'starting' || status === 'success') {
                    return;
                }

                socket.dispose();
                setSocketError('connecting');
                setIsConnected(false);
                setSocket(null);
                connect();
            });

            try {
                const data = await getWebsocketToken(uuid);
                if (isDisposed || active !== socket) {
                    return;
                }

                socket.setToken(data.token).connect(data.socket);
                setSocket(socket);
            } catch (error) {
                console.error(error);
                setSocketError('failed');
            }
        };

        connect();

        return () => {
            isDisposed = true;
            active?.dispose();
            reset();
        };
    }, [uuid]);
};

export { useServerSocket };
