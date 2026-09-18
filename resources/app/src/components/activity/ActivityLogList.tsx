import type { UseQueryResult } from '@tanstack/react-query';
import { HistoryIcon, XIcon } from 'lucide-react';

import type { ActivityLog } from '@/api/activity';
import { ActivityLogEntry } from '@/components/activity/ActivityLogEntry';
import { FormError } from '@/components/auth/FormError';
import { ListPagination } from '@/components/layout/ListPagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { httpErrorToHuman, type PaginatedResult } from '@/lib/http';

const ActivityLogList: React.FC<{
    query: UseQueryResult<PaginatedResult<ActivityLog>>;
    eventFilter?: string;
    onEventFilterChange: (event?: string) => void;
    onPageChange: (page: number) => void;
}> = ({ query, eventFilter, onEventFilterChange, onPageChange }) => {
    const { data, error, isPending } = query;

    return (
        <div className='flex flex-col gap-4'>
            <FormError message={error ? httpErrorToHuman(error) : null} />
            {eventFilter && (
                <div className='flex items-center gap-2'>
                    <Badge variant='secondary' className='font-mono'>
                        {eventFilter}
                    </Badge>
                    <Button variant='ghost' size='sm' onClick={() => onEventFilterChange(undefined)}>
                        <XIcon />
                        Clear filter
                    </Button>
                </div>
            )}
            {isPending ? (
                <Skeleton className='h-64 rounded-xl' />
            ) : data?.items.length ? (
                <div className='rounded-xl border bg-card'>
                    {data.items.map((activity) => (
                        <ActivityLogEntry key={activity.id} activity={activity} onEventClick={onEventFilterChange} />
                    ))}
                </div>
            ) : (
                !error && (
                    <Empty className='border'>
                        <EmptyHeader>
                            <EmptyMedia variant='icon'>
                                <HistoryIcon />
                            </EmptyMedia>
                            <EmptyTitle>No activity</EmptyTitle>
                            <EmptyDescription>No activity logs are available.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )
            )}
            {data && <ListPagination pagination={data.pagination} onPageChange={onPageChange} />}
        </div>
    );
};

export { ActivityLogList };
