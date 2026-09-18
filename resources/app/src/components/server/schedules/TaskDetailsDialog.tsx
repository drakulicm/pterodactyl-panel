import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    createOrUpdateScheduleTask,
    type Schedule,
    type ScheduleTask,
    type ScheduleTaskAction,
    serverSchedulesKey,
} from '@/api/server/schedules';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';

const ACTIONS = [
    { value: 'command', label: 'Send command' },
    { value: 'power', label: 'Send power action' },
    { value: 'backup', label: 'Create backup' },
] as const;

const POWER_ACTIONS = [
    { value: 'start', label: 'Start the server' },
    { value: 'restart', label: 'Restart the server' },
    { value: 'stop', label: 'Stop the server' },
    { value: 'kill', label: 'Terminate the server' },
] as const;

const schema = z
    .object({
        action: z.enum(['command', 'power', 'backup']),
        payload: z.string(),
        timeOffset: z
            .string()
            .trim()
            .min(1, 'A time offset value must be provided.')
            .refine((value) => /^\d+$/.test(value), 'The time offset must be a valid number between 0 and 900.')
            .refine((value) => Number(value) <= 900, 'The time offset must be less than 900 seconds.'),
        continueOnFailure: z.boolean(),
    })
    .refine((values) => values.action === 'backup' || values.payload.trim().length > 0, {
        path: ['payload'],
        message: 'A task payload must be provided.',
    });

type Values = z.infer<typeof schema>;

const isTaskAction = (action: string | undefined): action is ScheduleTaskAction =>
    ACTIONS.some((item) => item.value === action);

const toValues = (task?: ScheduleTask): Values => ({
    action: isTaskAction(task?.action) ? task.action : 'command',
    payload: task?.payload ?? '',
    timeOffset: task?.timeOffset.toString() ?? '0',
    continueOnFailure: task?.continueOnFailure ?? false,
});

const TaskDetailsDialog: React.FC<{
    schedule: Schedule;
    task?: ScheduleTask;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}> = ({ schedule, task, isOpen, onOpenChange }) => {
    const { server } = useServer();
    const queryClient = useQueryClient();
    const form = useForm<Values>({ resolver: zodResolver(schema), values: toValues(task) });
    const action = form.watch('action');
    const hasBackupsDisabled = server.featureLimits.backups === 0;

    const save = useMutation({
        mutationFn: (values: Values) =>
            createOrUpdateScheduleTask(server.uuid, schedule.id, task?.id, {
                action: values.action,
                payload: values.payload,
                timeOffset: Number(values.timeOffset),
                continueOnFailure: values.continueOnFailure,
            }),
        onSuccess: () => {
            toast.success(task ? 'The task has been updated.' : 'The task has been created.');
            queryClient.invalidateQueries({ queryKey: serverSchedulesKey(server.uuid) });
            handleOpenChange(false);
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset(toValues(task));
            save.reset();
        }

        onOpenChange(open);
    };

    const handleActionChange = (value: ScheduleTaskAction | null) => {
        if (!value) {
            return;
        }

        const initial = toValues(task);
        form.setValue('action', value);
        form.setValue('payload', value === initial.action ? initial.payload : value === 'power' ? 'start' : '');
        form.clearErrors('payload');
    };

    const handleSubmit = form.handleSubmit((values) => {
        if (hasBackupsDisabled && values.action === 'backup') {
            form.setError('action', {
                message: "A backup task cannot be created when the server's backup limit is set to 0.",
            });

            return;
        }

        save.mutate(values);
    });

    const errors = form.formState.errors;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg'>
                <form onSubmit={handleSubmit} noValidate className='contents'>
                    <DialogHeader>
                        <DialogTitle>{task ? 'Edit task' : 'Create task'}</DialogTitle>
                    </DialogHeader>
                    <FieldGroup>
                        <FormError message={save.error ? httpErrorToHuman(save.error) : null} />
                        <Field data-invalid={!!errors.action}>
                            <FieldLabel htmlFor='task-action'>Action</FieldLabel>
                            <Select items={ACTIONS} value={action} onValueChange={handleActionChange}>
                                <SelectTrigger id='task-action' className='w-full' aria-invalid={!!errors.action}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACTIONS.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError errors={[errors.action]} />
                        </Field>
                        <Field data-invalid={!!errors.timeOffset}>
                            <FieldLabel htmlFor='task-time-offset'>Time offset (in seconds)</FieldLabel>
                            <Input
                                id='task-time-offset'
                                inputMode='numeric'
                                aria-invalid={!!errors.timeOffset}
                                {...form.register('timeOffset')}
                            />
                            <FieldDescription>
                                The amount of time to wait after the previous task executes before running this one. If
                                this is the first task on a schedule this will not be applied.
                            </FieldDescription>
                            <FieldError errors={[errors.timeOffset]} />
                        </Field>
                        {action === 'power' ? (
                            <Controller
                                control={form.control}
                                name='payload'
                                render={({ field }) => (
                                    <Field data-invalid={!!errors.payload}>
                                        <FieldLabel htmlFor='task-payload'>Payload</FieldLabel>
                                        <Select
                                            items={POWER_ACTIONS}
                                            value={field.value}
                                            onValueChange={(value) => value && field.onChange(value)}
                                        >
                                            <SelectTrigger
                                                id='task-payload'
                                                className='w-full'
                                                aria-invalid={!!errors.payload}
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {POWER_ACTIONS.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={[errors.payload]} />
                                    </Field>
                                )}
                            />
                        ) : (
                            <Field data-invalid={!!errors.payload}>
                                <FieldLabel htmlFor='task-payload'>
                                    {action === 'backup' ? 'Ignored files' : 'Payload'}
                                </FieldLabel>
                                <Textarea
                                    id='task-payload'
                                    rows={6}
                                    className='font-mono'
                                    aria-invalid={!!errors.payload}
                                    {...form.register('payload')}
                                />
                                {action === 'backup' && (
                                    <FieldDescription>
                                        Optional. Include the files and folders to be excluded in this backup. By
                                        default, the contents of your .pteroignore file will be used. If you have
                                        reached your backup limit, the oldest backup will be rotated.
                                    </FieldDescription>
                                )}
                                <FieldError errors={[errors.payload]} />
                            </Field>
                        )}
                        <Controller
                            control={form.control}
                            name='continueOnFailure'
                            render={({ field }) => (
                                <Field orientation='horizontal'>
                                    <FieldContent>
                                        <FieldLabel htmlFor='task-continue-on-failure'>Continue on failure</FieldLabel>
                                        <FieldDescription>
                                            Future tasks will be run when this task fails.
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        id='task-continue-on-failure'
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </Field>
                            )}
                        />
                    </FieldGroup>
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={save.isPending}>
                            {save.isPending && <Spinner />}
                            {task ? 'Save changes' : 'Create task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { TaskDetailsDialog };
