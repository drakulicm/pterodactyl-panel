import { useQuery } from '@tanstack/react-query';
import { CalendarClockIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { serverSchedulesQueryOptions } from '@/api/server/schedules';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { EditScheduleDialog } from '@/components/server/schedules/EditScheduleDialog';
import { ScheduleRow } from '@/components/server/schedules/ScheduleRow';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const ServerSchedulesPage: React.FC = () => {
    const { server, permissions } = useServer();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const schedules = useQuery(serverSchedulesQueryOptions(server.uuid));
    const canCreate = hasPermission(permissions, 'schedule.create');

    return (
        <>
            <PageHeader title='Schedules'>
                {canCreate && (
                    <Button size='sm' onClick={() => setIsCreateOpen(true)}>
                        <PlusIcon />
                        New schedule
                    </Button>
                )}
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={schedules.error ? httpErrorToHuman(schedules.error) : null} />
                {schedules.isPending ? (
                    <Skeleton className='h-24' />
                ) : schedules.data?.length ? (
                    <div className='flex flex-col gap-2'>
                        {schedules.data.map((schedule) => (
                            <ScheduleRow key={schedule.id} schedule={schedule} />
                        ))}
                    </div>
                ) : (
                    !schedules.error && (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant='icon'>
                                    <CalendarClockIcon />
                                </EmptyMedia>
                                <EmptyTitle>No schedules</EmptyTitle>
                                <EmptyDescription>There are no schedules configured for this server.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                )}
            </div>
            {canCreate && <EditScheduleDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} />}
        </>
    );
};

export { ServerSchedulesPage };
