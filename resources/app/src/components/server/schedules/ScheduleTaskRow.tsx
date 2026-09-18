import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArchiveIcon, ArrowDownCircleIcon, ClockIcon, CodeIcon, PencilIcon, PowerIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteScheduleTask, type Schedule, type ScheduleTask, serverSchedulesKey } from '@/api/server/schedules';
import { ConfirmDeleteButton } from '@/components/layout/ConfirmDeleteButton';
import { TaskDetailsDialog } from '@/components/server/schedules/TaskDetailsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const ACTION_DETAILS = {
    command: { title: 'Send command', icon: CodeIcon },
    power: { title: 'Send power action', icon: PowerIcon },
    backup: { title: 'Create backup', icon: ArchiveIcon },
} as const;

const getActionDetails = (action: string) =>
    action in ACTION_DETAILS
        ? ACTION_DETAILS[action as keyof typeof ACTION_DETAILS]
        : { title: 'Unknown action', icon: CodeIcon };

const ScheduleTaskRow: React.FC<{
    schedule: Schedule;
    task: ScheduleTask;
}> = ({ schedule, task }) => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const canUpdate = hasPermission(permissions, 'schedule.update');
    const { title, icon: Icon } = getActionDetails(task.action);

    const remove = useMutation({
        mutationFn: () => deleteScheduleTask(server.uuid, schedule.id, task.id),
        onSuccess: () => {
            toast.success('The task has been deleted.');
            queryClient.invalidateQueries({ queryKey: serverSchedulesKey(server.uuid) });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    return (
        <div className='flex flex-col gap-3 border-b p-3 last:border-b-0 sm:flex-row sm:items-center'>
            <Icon className='hidden size-4 shrink-0 text-muted-foreground sm:block' />
            <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                <span className='text-sm font-medium'>{title}</span>
                {task.payload && (
                    <>
                        {task.action === 'backup' && (
                            <span className='text-xs text-muted-foreground'>Ignoring files & folders:</span>
                        )}
                        <code className='w-fit max-w-full rounded bg-muted px-2 py-1 font-mono text-xs break-all whitespace-pre-wrap'>
                            {task.payload}
                        </code>
                    </>
                )}
            </div>
            <div className='flex shrink-0 flex-wrap items-center gap-2'>
                {task.continueOnFailure && (
                    <Badge variant='secondary'>
                        <ArrowDownCircleIcon />
                        Continues on failure
                    </Badge>
                )}
                {task.sequenceId > 1 && task.timeOffset > 0 && (
                    <Badge variant='outline'>
                        <ClockIcon />
                        {task.timeOffset}s later
                    </Badge>
                )}
                {canUpdate && (
                    <div className='ml-auto flex items-center gap-1'>
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label='Edit scheduled task'
                            onClick={() => setIsEditing(true)}
                        >
                            <PencilIcon />
                        </Button>
                        <ConfirmDeleteButton
                            title='Confirm task deletion'
                            description='Are you sure you want to delete this task? This action cannot be undone.'
                            label='Delete scheduled task'
                            disabled={remove.isPending}
                            onConfirm={() => remove.mutate()}
                        />
                    </div>
                )}
            </div>
            {canUpdate && (
                <TaskDetailsDialog schedule={schedule} task={task} isOpen={isEditing} onOpenChange={setIsEditing} />
            )}
        </div>
    );
};

export { ScheduleTaskRow };
