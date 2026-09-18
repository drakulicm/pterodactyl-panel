import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowLeftIcon, ListTodoIcon, PencilIcon, PlayIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    deleteSchedule,
    serverScheduleQueryOptions,
    serverSchedulesKey,
    triggerScheduleExecution,
} from '@/api/server/schedules';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { EditScheduleDialog } from '@/components/server/schedules/EditScheduleDialog';
import { DATE_FORMAT } from '@/components/server/schedules/dateFormat';
import { ScheduleStatusBadge } from '@/components/server/schedules/ScheduleStatusBadge';
import { ScheduleTaskRow } from '@/components/server/schedules/ScheduleTaskRow';
import { TaskDetailsDialog } from '@/components/server/schedules/TaskDetailsDialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const CronBox: React.FC<{
    title: string;
    value: string;
}> = ({ title, value }) => {
    return (
        <div className='flex flex-col gap-1 rounded-lg border bg-card p-3'>
            <span className='text-xs text-muted-foreground'>{title}</span>
            <span className='truncate font-mono text-lg font-medium'>{value}</span>
        </div>
    );
};

const ServerSchedulePage: React.FC = () => {
    const { server, permissions } = useServer();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const params = useParams({ from: '/app/server/$id/schedules/$scheduleId' });
    const scheduleId = Number(params.scheduleId);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isTaskOpen, setIsTaskOpen] = useState(false);

    const canUpdate = hasPermission(permissions, 'schedule.update');
    const canDelete = hasPermission(permissions, 'schedule.delete');

    const query = useQuery({
        ...serverScheduleQueryOptions(server.uuid, scheduleId),
        enabled: Number.isInteger(scheduleId),
        refetchInterval: (state) => (state.state.data?.isProcessing ? 5000 : false),
    });

    const run = useMutation({
        mutationFn: () => triggerScheduleExecution(server.uuid, scheduleId),
        onSuccess: () => {
            toast.success('The schedule has been queued for execution.');
            queryClient.invalidateQueries({ queryKey: serverSchedulesKey(server.uuid) });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const remove = useMutation({
        mutationFn: () => deleteSchedule(server.uuid, scheduleId),
        onSuccess: () => {
            toast.success('The schedule has been deleted.');
            queryClient.removeQueries({ queryKey: serverScheduleQueryOptions(server.uuid, scheduleId).queryKey });
            queryClient.invalidateQueries({ queryKey: serverSchedulesKey(server.uuid) });
            navigate({ to: '/server/$id/schedules', params: { id: server.id } });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const schedule = query.data;

    return (
        <>
            <PageHeader title={schedule ? schedule.name : 'Schedule'}>
                <Button variant='ghost' size='sm' render={<Link to='/server/$id/schedules' params={{ id: server.id }} />}>
                    <ArrowLeftIcon />
                    All schedules
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError
                    message={
                        query.error
                            ? httpErrorToHuman(query.error)
                            : Number.isInteger(scheduleId)
                              ? null
                              : 'The requested schedule could not be found.'
                    }
                />
                {query.isLoading && <Skeleton className='h-48' />}
                {schedule && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle className='flex flex-wrap items-center gap-2'>
                                    {schedule.name}
                                    <ScheduleStatusBadge schedule={schedule} />
                                </CardTitle>
                                <CardDescription>
                                    Last run at: {schedule.lastRunAt ? format(schedule.lastRunAt, DATE_FORMAT) : 'n/a'}
                                    {' · '}
                                    Next run at: {schedule.nextRunAt ? format(schedule.nextRunAt, DATE_FORMAT) : 'n/a'}
                                    {schedule.onlyWhenOnline && ' · Only when server is online'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-4'>
                                <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
                                    <CronBox title='Minute' value={schedule.cron.minute} />
                                    <CronBox title='Hour' value={schedule.cron.hour} />
                                    <CronBox title='Day (month)' value={schedule.cron.dayOfMonth} />
                                    <CronBox title='Month' value={schedule.cron.month} />
                                    <CronBox title='Day (week)' value={schedule.cron.dayOfWeek} />
                                </div>
                                <div className='flex flex-wrap items-center gap-2'>
                                    {canUpdate && (
                                        <>
                                            <Button variant='outline' size='sm' onClick={() => setIsEditOpen(true)}>
                                                <PencilIcon />
                                                Edit
                                            </Button>
                                            <Button size='sm' onClick={() => setIsTaskOpen(true)}>
                                                <PlusIcon />
                                                New task
                                            </Button>
                                        </>
                                    )}
                                    {canUpdate && schedule.tasks.length > 0 && (
                                        <Button
                                            variant='secondary'
                                            size='sm'
                                            disabled={schedule.isProcessing || run.isPending}
                                            onClick={() => run.mutate()}
                                        >
                                            {run.isPending ? <Spinner /> : <PlayIcon />}
                                            Run now
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <AlertDialog>
                                            <AlertDialogTrigger
                                                render={
                                                    <Button
                                                        variant='destructive'
                                                        size='sm'
                                                        className='sm:ml-auto'
                                                        disabled={remove.isPending}
                                                    />
                                                }
                                            >
                                                {remove.isPending ? <Spinner /> : <Trash2Icon />}
                                                Delete
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete schedule</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        All tasks will be removed and any running processes will be
                                                        terminated.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        variant='destructive'
                                                        onClick={() => remove.mutate()}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Tasks</CardTitle>
                                <CardDescription>Tasks run in order each time this schedule executes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {schedule.tasks.length ? (
                                    <div className='flex flex-col rounded-lg border'>
                                        {schedule.tasks.map((task) => (
                                            <ScheduleTaskRow key={task.id} schedule={schedule} task={task} />
                                        ))}
                                    </div>
                                ) : (
                                    <Empty>
                                        <EmptyHeader>
                                            <EmptyMedia variant='icon'>
                                                <ListTodoIcon />
                                            </EmptyMedia>
                                            <EmptyTitle>No tasks</EmptyTitle>
                                            <EmptyDescription>
                                                There are no tasks configured for this schedule.
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                )}
                            </CardContent>
                        </Card>
                        {canUpdate && (
                            <>
                                <EditScheduleDialog
                                    schedule={schedule}
                                    isOpen={isEditOpen}
                                    onOpenChange={setIsEditOpen}
                                />
                                <TaskDetailsDialog
                                    schedule={schedule}
                                    isOpen={isTaskOpen}
                                    onOpenChange={setIsTaskOpen}
                                />
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export { ServerSchedulePage };
