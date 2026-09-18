import { create } from 'zustand';

import type { ServerPowerState } from '@/api/server/types';
import type { ServerSocket } from '@/lib/ServerSocket';

type SocketError = 'connecting' | 'failed' | 'credentials' | null;

interface ServerStore {
    socket: ServerSocket | null;
    isConnected: boolean;
    socketError: SocketError;
    powerState: ServerPowerState | null;
    setSocket: (socket: ServerSocket | null) => void;
    setIsConnected: (isConnected: boolean) => void;
    setSocketError: (socketError: SocketError) => void;
    setPowerState: (powerState: ServerPowerState | null) => void;
    reset: () => void;
}

const useServerStore = create<ServerStore>((set) => ({
    socket: null,
    isConnected: false,
    socketError: null,
    powerState: null,
    setSocket: (socket) => set({ socket }),
    setIsConnected: (isConnected) => set(isConnected ? { isConnected, socketError: null } : { isConnected }),
    setSocketError: (socketError) => set({ socketError }),
    setPowerState: (powerState) => set({ powerState }),
    reset: () => set({ socket: null, isConnected: false, socketError: null, powerState: null }),
}));

export { useServerStore };
export type { SocketError };
