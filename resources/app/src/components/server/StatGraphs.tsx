import { bytesToString } from '@/lib/format';
import { buildSparkline, TOP_INSET, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '@/lib/sparkline';
import { type StatsPoint, useStatsStore } from '@/stores/statsStore';

type SeriesKey = keyof StatsPoint;

const GRID_LINES = [0, 1, 2, 3, 4].map((step) => TOP_INSET + (step * (VIEWBOX_HEIGHT - TOP_INSET)) / 4);

const SERIES_CLASSES: Record<SeriesKey, string> = {
    cpu: 'text-chart-1',
    memory: 'text-chart-2',
    rx: 'text-chart-3',
    tx: 'text-chart-4',
};

const CPU_KEYS: SeriesKey[] = ['cpu'];
const MEMORY_KEYS: SeriesKey[] = ['memory'];
const NETWORK_KEYS: SeriesKey[] = ['rx', 'tx'];

const Sparkline: React.FC<{
    points: StatsPoint[];
    keys: SeriesKey[];
}> = ({ points, keys }) => {
    const max = Math.max(1, ...keys.flatMap((key) => points.map((point) => point[key])));

    return (
        <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            preserveAspectRatio='none'
            className='h-24 w-full'
            aria-hidden='true'
        >
            {GRID_LINES.map((offset) => (
                <line
                    key={offset}
                    x1={0}
                    x2={VIEWBOX_WIDTH}
                    y1={offset}
                    y2={offset}
                    className='stroke-border'
                    strokeOpacity={0.4}
                    vectorEffect='non-scaling-stroke'
                />
            ))}
            {keys.map((key) => {
                const { line, area } = buildSparkline(
                    points.map((point) => point[key]),
                    max,
                );

                return (
                    <g key={key} className={SERIES_CLASSES[key]}>
                        <path d={area} fill='currentColor' fillOpacity={0.15} stroke='none' />
                        <path
                            d={line}
                            fill='none'
                            stroke='currentColor'
                            strokeWidth={1.5}
                            strokeLinejoin='round'
                            vectorEffect='non-scaling-stroke'
                        />
                    </g>
                );
            })}
        </svg>
    );
};

const GraphCard: React.FC<{
    title: string;
    value: string;
    points: StatsPoint[];
    keys: SeriesKey[];
}> = ({ title, value, points, keys }) => {
    return (
        <div className='flex flex-col gap-2 rounded-xl border bg-card p-3'>
            <div className='flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>{title}</span>
                <span className='font-medium tabular-nums'>{value}</span>
            </div>
            <Sparkline points={points} keys={keys} />
        </div>
    );
};

const StatGraphs: React.FC = () => {
    const points = useStatsStore((state) => state.points);
    const latest = points[points.length - 1];

    return (
        <div className='grid gap-3 md:grid-cols-3'>
            <GraphCard
                title='CPU Load'
                value={`${(latest?.cpu ?? 0).toFixed(2)}%`}
                points={points}
                keys={CPU_KEYS}
            />
            <GraphCard
                title='Memory'
                value={bytesToString(latest?.memory ?? 0)}
                points={points}
                keys={MEMORY_KEYS}
            />
            <GraphCard
                title='Network'
                value={`${bytesToString(latest?.rx ?? 0)} in / ${bytesToString(latest?.tx ?? 0)} out`}
                points={points}
                keys={NETWORK_KEYS}
            />
        </div>
    );
};

export { StatGraphs };
