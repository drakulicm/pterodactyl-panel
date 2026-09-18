import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { z } from 'zod';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const INVALID_SOURCES = ['/etc/pterodactyl', '/var/lib/pterodactyl/volumes', '/srv/daemon-data'];

const mountSchema = z.object({
    name: z
        .string()
        .min(2, 'The name must be at least 2 characters.')
        .max(64, 'The name may not be greater than 64 characters.'),
    description: z.string().max(191, 'The description must be less than 191 characters.'),
    source: z
        .string()
        .min(1, 'A source path is required.')
        .refine((value) => !INVALID_SOURCES.includes(value), 'The selected source path is not allowed.'),
    target: z
        .string()
        .min(1, 'A target path is required.')
        .refine((value) => value !== '/home/container', 'The selected target path is not allowed.'),
    read_only: z.boolean(),
    user_mountable: z.boolean(),
});

type MountFormValues = z.infer<typeof mountSchema>;

const MountFields: React.FC<{
    form: UseFormReturn<MountFormValues>;
    idPrefix: string;
}> = ({ form, idPrefix }) => {
    const { errors } = form.formState;

    return (
        <>
            <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
                <Input id={`${idPrefix}-name`} aria-invalid={!!errors.name} {...form.register('name')} />
                <FieldDescription>Unique name used to separate this mount from another.</FieldDescription>
                <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor={`${idPrefix}-description`}>Description</FieldLabel>
                <Textarea id={`${idPrefix}-description`} rows={3} {...form.register('description')} />
                <FieldDescription>
                    A longer description for this mount, must be less than 191 characters.
                </FieldDescription>
                <FieldError errors={[errors.description]} />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
                <Field data-invalid={!!errors.source}>
                    <FieldLabel htmlFor={`${idPrefix}-source`}>Source</FieldLabel>
                    <Input
                        id={`${idPrefix}-source`}
                        className='font-mono text-xs'
                        aria-invalid={!!errors.source}
                        {...form.register('source')}
                    />
                    <FieldDescription>File path on the host system to mount to a container.</FieldDescription>
                    <FieldError errors={[errors.source]} />
                </Field>
                <Field data-invalid={!!errors.target}>
                    <FieldLabel htmlFor={`${idPrefix}-target`}>Target</FieldLabel>
                    <Input
                        id={`${idPrefix}-target`}
                        className='font-mono text-xs'
                        aria-invalid={!!errors.target}
                        {...form.register('target')}
                    />
                    <FieldDescription>Where the mount will be accessible inside a container.</FieldDescription>
                    <FieldError errors={[errors.target]} />
                </Field>
            </div>
            <Field orientation='horizontal'>
                <Controller
                    control={form.control}
                    name='read_only'
                    render={({ field }) => (
                        <Switch id={`${idPrefix}-read-only`} checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
                <div className='flex flex-col gap-1'>
                    <FieldLabel htmlFor={`${idPrefix}-read-only`}>Read only</FieldLabel>
                    <FieldDescription>Is the mount read only inside the container?</FieldDescription>
                </div>
            </Field>
            <Field orientation='horizontal'>
                <Controller
                    control={form.control}
                    name='user_mountable'
                    render={({ field }) => (
                        <Switch
                            id={`${idPrefix}-user-mountable`}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    )}
                />
                <div className='flex flex-col gap-1'>
                    <FieldLabel htmlFor={`${idPrefix}-user-mountable`}>User mountable</FieldLabel>
                    <FieldDescription>Should users be able to mount this themselves?</FieldDescription>
                </div>
            </Field>
        </>
    );
};

export { MountFields, mountSchema };
export type { MountFormValues };
