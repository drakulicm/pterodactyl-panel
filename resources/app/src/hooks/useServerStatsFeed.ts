import { useEffect } from 'react';

import { useSocketEvent } from '@/hooks/useSocketEvent';
import { SocketEvent, SocketRequest } from '@/lib/socketEvents';
import { useServerStore } from '@/stores/serverStore';
import { useStatsStore } from '@/stores/statsStore';

interface RawStats {
    cpu_absolute: number;
    memory_bytes: number;
    disk_bytes: number;
    uptime?: number;
    network: { rx_bytes: number; tx_bytes: number };
}

const useServerStatsFeed = (): void => {
    const socket = useServerStore((state) => state.socket);
    const isConnected = useServerStore((state) => state.isConnected);
    const powerState = useServerStore((state) => state.powerState);

    useEffect(() => {
        if (socket && isConnected) {
            socket.send(SocketRequest.SEND_STATS);
        }
    }, [socket, isConnected]);

    useEffect(() => {
        if (powerState === 'offline') {
            useStatsStore.getState().resetGraph();
        }
    }, [powerState]);

    useEffect(() => () => useStatsStore.getState().reset(), []);

    useSocketEvent(SocketEvent.STATS, (data) => {
        try {
            const parsed = JSON.parse(data) as RawStats;

            useStatsStore.getState().push({
                cpu: parsed.cpu_absolute,
                memory: parsed.memory_bytes,
                disk: parsed.disk_bytes,
                uptime: parsed.uptime ?? 0,
                rx: parsed.network.rx_bytes,
                tx: parsed.network.tx_bytes,
            });
        } catch {
            return;
        }
    });
};

export { useServerStatsFeed };
