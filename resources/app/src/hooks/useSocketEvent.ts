import { useEffect, useRef } from 'react';

import { useServerStore } from '@/stores/serverStore';

const useSocketEvent = (event: string, handler: (...args: string[]) => void): void => {
    const socket = useServerStore((state) => state.socket);
    const savedHandler = useRef(handler);

    useEffect(() => {
        savedHandler.current = handler;
    }, [handler]);

    useEffect(() => {
        if (!socket) {
            return;
        }

        return socket.on(event, (...args) => savedHandler.current(...args));
    }, [socket, event]);
};

export { useSocketEvent };
