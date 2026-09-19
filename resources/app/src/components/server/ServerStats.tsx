import {
    ArrowDownToLineIcon,
    ArrowUpFromLineIcon,
    ClockIcon,
    CpuIcon,
    HardDriveIcon,
    MemoryStickIcon,
    NetworkIcon,
} from 'lucide-react';

import { useServer } from '@/hooks/useServer';
import { bytesToString, formatIp, formatUptime, mbToBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useServerStore } from '@/stores/serverStore';
import { useStatsStore } from '@/stores/statsStore';

const UNLIMITED = 'Unlimited';

const StatBlock: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string;
    limit?: string;
    isAlarm?: boolean;
}> = ({ icon: Icon, title, value, limit, isAlarm }) => {
    return (
        <div className='flex items-center gap-3 rounded-xl border bg-card p-3'>
            <div
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200',
                    isAlarm && 'bg-destructive/15 text-destructive',
                )}
            >
                <Icon className='size-4' />
            </div>
            <div className='flex min-w-0 flex-col'>
                <span className='text-xs text-muted-foreground'>{title}</span>
                <span className='truncate text-sm font-medium tabular-nums'>
                    {value}
                    {limit && <span className='text-xs font-normal text-muted-foreground'> / {limit}</span>}
                </span>
            </div>
        </div>
    );
};

const ServerStats: React.FC = () => {
    const { server } = useServer();
    const powerState = useServerStore((state) => state.powerState);
    const stats = useStatsStore((state) => state.latest);

    const allocation = server.allocations.find((item) => item.isDefault);
    const isOffline = !powerState || powerState === 'offline';
    const { cpu, memory, disk } = server.limits;

    return (
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-1'>
            <StatBlock
                icon={NetworkIcon}
                title='Address'
                value={allocation ? `${allocation.alias ?? formatIp(allocation.ip)}:${allocation.port}` : 'n/a'}
            />
            <StatBlock
                icon={ClockIcon}
                title='Uptime'
                value={isOffline ? 'Offline' : stats.uptime > 0 ? formatUptime(stats.uptime) : powerState}
            />
            <StatBlock
                icon={CpuIcon}
                title='CPU Load'
                value={isOffline ? 'Offline' : `${stats.cpu.toFixed(2)}%`}
                limit={cpu === 0 ? UNLIMITED : `${cpu}%`}
                isAlarm={!isOffline && cpu > 0 && stats.cpu >= cpu * 0.9}
            />
            <StatBlock
                icon={MemoryStickIcon}
                title='Memory'
                value={isOffline ? 'Offline' : bytesToString(stats.memory)}
                limit={memory === 0 ? UNLIMITED : bytesToString(mbToBytes(memory))}
                isAlarm={!isOffline && memory > 0 && stats.memory / mbToBytes(memory) >= 0.9}
            />
            <StatBlock
                icon={HardDriveIcon}
                title='Disk'
                value={bytesToString(stats.disk)}
                limit={disk === 0 ? UNLIMITED : bytesToString(mbToBytes(disk))}
                isAlarm={disk > 0 && stats.disk / mbToBytes(disk) >= 0.9}
            />
            <StatBlock
                icon={ArrowDownToLineIcon}
                title='Network (Inbound)'
                value={isOffline ? 'Offline' : bytesToString(stats.rx)}
            />
            <StatBlock
                icon={ArrowUpFromLineIcon}
                title='Network (Outbound)'
                value={isOffline ? 'Offline' : bytesToString(stats.tx)}
            />
        </div>
    );
};

export { ServerStats };
