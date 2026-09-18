import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createOrUpdateSchedule, type Schedule, serverSchedulesKey } from '@/api/server/schedules';
import { FormError } from '@/components/auth/FormError';
import { ScheduleCheatsheet } from '@/components/server/schedules/ScheduleCheatsheet';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';

const cronField = z.string().trim().min(1, 'Required.');

const schema = z.object({
    name: z.string().trim().min(1, 'A schedule name must be provided.'),
    minute: cronField,
    hour: cronField,
    dayOfMonth: cronField,
    month: cronField,
    dayOfWeek: cronField,
    onlyWhenOnline: z.boolean(),
    isActive: z.boolean(),
});

type Values = z.infer<typeof schema>;

const CRON_FIELDS = [
    ['minute', 'Minute'],
    ['hour', 'Hour'],
    ['dayOfMonth', 'Day of month'],
    ['month', 'Month'],
    ['dayOfWeek', 'Day of week'],
] as const;

const toValues = (schedule?: Schedule): Values => ({
    name: schedule?.name ?? '',
    minute: schedule?.cron.minute ?? '*/5',
    hour: schedule?.cron.hour ?? '*',
    dayOfMonth: schedule?.cron.dayOfMonth ?? '*',
    month: schedule?.cron.month ?? '*',
    dayOfWeek: schedule?.cron.dayOfWeek ?? '*',
    onlyWhenOnline: schedule?.onlyWhenOnline ?? true,
    isActive: schedule?.isActive ?? true,
});

const EditScheduleDialog: React.FC<{
    schedule?: Schedule;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}> = ({ schedule, isOpen, onOpenChange }) => {
    const { server } = useServer();
    const queryClient = useQueryClient();
    const [isCheatsheetVisible, setIsCheatsheetVisible] = useState(false);
    const form = useForm<Values>({ resolver: zodResolver(schema), values: toValues(schedule) });

    const save = useMutation({
        mutationFn: (values: Values) =>
            createOrUpdateSchedule(server.uuid, {
                id: schedule?.id,
                name: values.name,
                cron: {
                    minute: values.minute,
                    hour: values.hour,
                    dayOfMonth: values.dayOfMonth,
                    month: values.month,
                    dayOfWeek: values.dayOfWeek,
                },
                onlyWhenOnline: values.onlyWhenOnline,
                isActive: values.isActive,
            }),
        onSuccess: (saved) => {
            toast.success(
                schedule ? `Schedule ${saved.name} has been updated.` : `Schedule ${saved.name} has been created.`,
            );
            queryClient.invalidateQueries({ queryKey: serverSchedulesKey(server.uuid) });
            handleOpenChange(false);
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset(toValues(schedule));
            save.reset();
        }

        onOpenChange(open);
    };

    const handleSubmit = form.handleSubmit((values) => save.mutate(values));

    const errors = form.formState.errors;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl'>
                <form onSubmit={handleSubmit} noValidate className='contents'>
                    <DialogHeader>
                        <DialogTitle>{schedule ? 'Edit schedule' : 'Create new schedule'}</DialogTitle>
                        <DialogDescription>
                            The schedule system supports the use of Cronjob syntax when defining when tasks should begin
                            running.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup>
                        <FormError message={save.error ? httpErrorToHuman(save.error) : null} />
                        <Field data-invalid={!!errors.name}>
                            <FieldLabel htmlFor='schedule-name'>Schedule name</FieldLabel>
                            <Input id='schedule-name' aria-invalid={!!errors.name} {...form.register('name')} />
                            <FieldDescription>A human readable identifier for this schedule.</FieldDescription>
                            <FieldError errors={[errors.name]} />
                        </Field>
                        <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
                            {CRON_FIELDS.map(([name, label]) => (
                                <Field key={name} data-invalid={!!errors[name]}>
                                    <FieldLabel htmlFor={`schedule-${name}`}>{label}</FieldLabel>
                                    <Input
                                        id={`schedule-${name}`}
                                        className='font-mono'
                                        aria-invalid={!!errors[name]}
                                        {...form.register(name)}
                                    />
                                    <FieldError errors={[errors[name]]} />
                                </Field>
                            ))}
                        </div>
                        <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='schedule-cheatsheet'>Show cheatsheet</FieldLabel>
                                <FieldDescription>Show the cron cheatsheet for some examples.</FieldDescription>
                            </FieldContent>
                            <Switch
                                id='schedule-cheatsheet'
                                checked={isCheatsheetVisible}
                                onCheckedChange={setIsCheatsheetVisible}
                            />
                        </Field>
                        {isCheatsheetVisible && <ScheduleCheatsheet />}
                        <Controller
                            control={form.control}
                            name='onlyWhenOnline'
                            render={({ field }) => (
                                <Field orientation='horizontal'>
                                    <FieldContent>
                                        <FieldLabel htmlFor='schedule-only-when-online'>
                                            Only when server is online
                                        </FieldLabel>
                                        <FieldDescription>
                                            Only execute this schedule when the server is in a running state.
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        id='schedule-only-when-online'
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name='isActive'
                            render={({ field }) => (
                                <Field orientation='horizontal'>
                                    <FieldContent>
                                        <FieldLabel htmlFor='schedule-enabled'>Schedule enabled</FieldLabel>
                                        <FieldDescription>
                                            This schedule will be executed automatically if enabled.
                                        </FieldDescription>
                                    </FieldContent>
                                    <Switch
                                        id='schedule-enabled'
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
                            {schedule ? 'Save changes' : 'Create schedule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { EditScheduleDialog };
