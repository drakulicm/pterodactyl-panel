import { create } from 'zustand';

const POINTS = 20;

interface LiveStats {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
    rx: number;
    tx: number;
}

interface StatsPoint {
    cpu: number;
    memory: number;
    rx: number;
    tx: number;
}

const INITIAL_STATS: LiveStats = { cpu: 0, memory: 0, disk: 0, uptime: 0, rx: 0, tx: 0 };

const createEmptyPoints = (): StatsPoint[] =>
    Array.from({ length: POINTS }, () => ({ cpu: 0, memory: 0, rx: 0, tx: 0 }));

interface StatsStore {
    latest: LiveStats;
    points: StatsPoint[];
    hasSample: boolean;
    push: (stats: LiveStats) => void;
    resetGraph: () => void;
    reset: () => void;
}

const useStatsStore = create<StatsStore>((set) => ({
    latest: INITIAL_STATS,
    points: createEmptyPoints(),
    hasSample: false,
    push: (stats) =>
        set((state) => ({
            latest: stats,
            hasSample: true,
            points: [
                ...state.points.slice(1),
                {
                    cpu: stats.cpu,
                    memory: stats.memory,
                    rx: state.hasSample ? Math.max(0, stats.rx - state.latest.rx) : 0,
                    tx: state.hasSample ? Math.max(0, stats.tx - state.latest.tx) : 0,
                },
            ],
        })),
    resetGraph: () => set({ points: createEmptyPoints(), hasSample: false }),
    reset: () => set({ latest: INITIAL_STATS, points: createEmptyPoints(), hasSample: false }),
}));

export { useStatsStore };
export type { LiveStats, StatsPoint };
