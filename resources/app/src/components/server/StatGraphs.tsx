import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, YAxis } from 'recharts';

import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { bytesToString } from '@/lib/format';
import { SocketEvent } from '@/lib/socketEvents';
import { useServerStore } from '@/stores/serverStore';

interface Point {
    index: number;
    cpu: number;
    memory: number;
    rx: number;
    tx: number;
}

const POINTS = 20;

const createEmptyPoints = (): Point[] =>
    Array.from({ length: POINTS }, (_, index) => ({ index, cpu: 0, memory: 0, rx: 0, tx: 0 }));

const CPU_CONFIG = { cpu: { label: 'CPU', color: 'var(--chart-1)' } } satisfies ChartConfig;
const MEMORY_CONFIG = { memory: { label: 'Memory', color: 'var(--chart-2)' } } satisfies ChartConfig;
const NETWORK_CONFIG = {
    rx: { label: 'Inbound', color: 'var(--chart-3)' },
    tx: { label: 'Outbound', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const GraphCard: React.FC<{
    title: string;
    value: string;
    config: ChartConfig;
    data: Point[];
    keys: (keyof Point)[];
}> = ({ title, value, config, data, keys }) => {
    return (
        <div className='flex flex-col gap-2 rounded-xl border bg-card p-3'>
            <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>{title}</span>
                <span className='font-medium tabular-nums'>{value}</span>
            </div>
            <ChartContainer config={config} className='aspect-auto h-24 w-full'>
                <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} strokeOpacity={0.4} />
                    <YAxis hide domain={[0, (max: number) => Math.max(max, 1)]} />
                    {keys.map((key) => (
                        <Area
                            key={key}
                            dataKey={key}
                            type='monotone'
                            stroke={`var(--color-${key})`}
                            fill={`var(--color-${key})`}
                            fillOpacity={0.15}
                            strokeWidth={1.5}
                            isAnimationActive={false}
                        />
                    ))}
                </AreaChart>
            </ChartContainer>
        </div>
    );
};

const StatGraphs: React.FC = () => {
    const powerState = useServerStore((state) => state.powerState);
    const [points, setPoints] = useState<Point[]>(createEmptyPoints);
    const previous = useRef<{ rx: number; tx: number } | null>(null);
    const counter = useRef(POINTS);

    useEffect(() => {
        if (powerState === 'offline') {
            setPoints(createEmptyPoints());
            previous.current = null;
        }
    }, [powerState]);

    useSocketEvent(SocketEvent.STATS, (data) => {
        try {
            const parsed = JSON.parse(data);
            const rxTotal = parsed.network.rx_bytes as number;
            const txTotal = parsed.network.tx_bytes as number;
            const last = previous.current;
            previous.current = { rx: rxTotal, tx: txTotal };
            counter.current += 1;

            setPoints((current) => [
                ...current.slice(1),
                {
                    index: counter.current,
                    cpu: parsed.cpu_absolute,
                    memory: parsed.memory_bytes,
                    rx: last ? Math.max(0, rxTotal - last.rx) : 0,
                    tx: last ? Math.max(0, txTotal - last.tx) : 0,
                },
            ]);
        } catch {
            return;
        }
    });

    const latest = points[points.length - 1];

    return (
        <div className='grid gap-3 md:grid-cols-3'>
            <GraphCard
                title='CPU Load'
                value={`${(latest?.cpu ?? 0).toFixed(2)}%`}
                config={CPU_CONFIG}
                data={points}
                keys={['cpu']}
            />
            <GraphCard
                title='Memory'
                value={bytesToString(latest?.memory ?? 0)}
                config={MEMORY_CONFIG}
                data={points}
                keys={['memory']}
            />
            <GraphCard
                title='Network'
                value={`${bytesToString(latest?.rx ?? 0)} in / ${bytesToString(latest?.tx ?? 0)} out`}
                config={NETWORK_CONFIG}
                data={points}
                keys={['rx', 'tx']}
            />
        </div>
    );
};

export { StatGraphs };
