import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CpuIcon, HardDriveIcon, MemoryStickIcon, NetworkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Server } from '@/api/server/types';
import { serverResourcesQueryOptions } from '@/api/servers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { bytesToString, formatIp, mbToBytes } from '@/lib/format';
import { POWER_STATE_CLASSES } from '@/lib/powerState';
import { cn } from '@/lib/utils';

const getStatusLabel = (server: Server, isSuspended: boolean): string | null => {
    if (isSuspended || server.status === 'suspended') {
        return 'Suspended';
    }

    if (server.isTransferring) {
        return 'Transferring';
    }

    if (server.status === 'installing') {
        return 'Installing';
    }

    if (server.status === 'restoring_backup') {
        return 'Restoring Backup';
    }

    if (server.status === 'install_failed' || server.status === 'reinstall_failed') {
        return 'Install Failed';
    }

    if (server.isNodeUnderMaintenance) {
        return 'Maintenance';
    }

    return null;
};

const Stat: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    limit: string;
    isAlarm: boolean;
}> = ({ icon: Icon, value, limit, isAlarm }) => {
    return (
        <div className='flex min-w-0 flex-col gap-0.5'>
            <div className={cn('flex items-center gap-1.5 text-sm font-medium tabular-nums', isAlarm && 'text-destructive')}>
                <Icon className='size-3.5 shrink-0 text-muted-foreground' />
                <span className='truncate'>{value}</span>
            </div>
            <span className='truncate text-xs text-muted-foreground'>of {limit}</span>
        </div>
    );
};

const ServerCard: React.FC<{
    server: Server;
}> = ({ server }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isInViewport, setIsInViewport] = useState(false);

    useEffect(() => {
        const element = cardRef.current;
        if (!element) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => setIsInViewport(entries.some((entry) => entry.isIntersecting)),
            { rootMargin: '200px' },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const canQueryResources = !server.status && !server.isTransferring && !server.isNodeUnderMaintenance;
    const { data: stats, isError } = useQuery(
        serverResourcesQueryOptions(server.uuid, canQueryResources && isInViewport),
    );

    const allocation = server.allocations.find((item) => item.isDefault);
    const statusLabel = getStatusLabel(server, stats?.isSuspended ?? false);
    const memoryLimit = server.limits.memory === 0 ? 'Unlimited' : bytesToString(mbToBytes(server.limits.memory));
    const diskLimit = server.limits.disk === 0 ? 'Unlimited' : bytesToString(mbToBytes(server.limits.disk));
    const cpuLimit = server.limits.cpu === 0 ? 'Unlimited' : `${server.limits.cpu}%`;

    return (
        <Link to='/server/$id' params={{ id: server.id }} className='group/server block rounded-xl outline-none'>
            <Card
                ref={cardRef}
                className='h-full transition-colors duration-150 ease group-hover/server:bg-muted/40 group-focus-visible/server:ring-3 group-focus-visible/server:ring-ring/50'
            >
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                        <span
                            className={cn(
                                'size-2 shrink-0 rounded-full bg-muted-foreground/40',
                                stats && !statusLabel && POWER_STATE_CLASSES[stats.status],
                            )}
                        />
                        <span className='truncate'>{server.name}</span>
                        {statusLabel && (
                            <Badge variant='secondary' className='ml-auto'>
                                {statusLabel}
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription className='flex items-center gap-1.5 truncate'>
                        <NetworkIcon className='size-3.5 shrink-0' />
                        {allocation ? `${allocation.alias ?? formatIp(allocation.ip)}:${allocation.port}` : 'No allocation'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {statusLabel || isError ? (
                        <p className='text-sm text-muted-foreground'>
                            {statusLabel ? 'Resource usage is unavailable.' : 'Unable to reach this server.'}
                        </p>
                    ) : !stats ? (
                        <div className='grid grid-cols-3 gap-4'>
                            <Skeleton className='h-9' />
                            <Skeleton className='h-9' />
                            <Skeleton className='h-9' />
                        </div>
                    ) : (
                        <div className='grid grid-cols-3 gap-4'>
                            <Stat
                                icon={CpuIcon}
                                value={`${stats.cpuUsagePercent.toFixed(2)}%`}
                                limit={cpuLimit}
                                isAlarm={server.limits.cpu > 0 && stats.cpuUsagePercent >= server.limits.cpu * 0.9}
                            />
                            <Stat
                                icon={MemoryStickIcon}
                                value={bytesToString(stats.memoryUsageInBytes)}
                                limit={memoryLimit}
                                isAlarm={
                                    server.limits.memory > 0 &&
                                    stats.memoryUsageInBytes / mbToBytes(server.limits.memory) >= 0.9
                                }
                            />
                            <Stat
                                icon={HardDriveIcon}
                                value={bytesToString(stats.diskUsageInBytes)}
                                limit={diskLimit}
                                isAlarm={
                                    server.limits.disk > 0 && stats.diskUsageInBytes / mbToBytes(server.limits.disk) >= 0.9
                                }
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
};

export { ServerCard };
