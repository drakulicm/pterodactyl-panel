import { useQuery } from '@tanstack/react-query';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

import { databaseHostNodesQueryOptions } from '@/admin/api/databases';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NO_NODE = 'none';

const databaseHostSchema = z.object({
    name: z.string().min(1, 'A name is required.').max(191, 'The name may not exceed 191 characters.'),
    host: z
        .string()
        .min(1, 'A host is required.')
        .regex(/^[\w\-.]+$/, 'The host must be a valid IP address or domain name.'),
    port: z
        .string()
        .regex(/^\d+$/, 'The port must be a number between 1 and 65535.')
        .refine((value) => Number(value) >= 1 && Number(value) <= 65535, {
            message: 'The port must be a number between 1 and 65535.',
        }),
    username: z.string().min(1, 'A username is required.').max(32, 'The username may not exceed 32 characters.'),
    password: z.string(),
    nodeId: z.string(),
});

type DatabaseHostFormValues = z.infer<typeof databaseHostSchema>;

const toDatabaseHostBody = (values: DatabaseHostFormValues) => ({
    name: values.name,
    host: values.host,
    port: Number(values.port),
    username: values.username,
    password: values.password || undefined,
    node_id: values.nodeId === NO_NODE ? null : Number(values.nodeId),
});

const DatabaseHostFields: React.FC<{
    form: UseFormReturn<DatabaseHostFormValues>;
    idPrefix: string;
    isEditing?: boolean;
}> = ({ form, idPrefix, isEditing }) => {
    const nodes = useQuery(databaseHostNodesQueryOptions);
    const { errors } = form.formState;
    const nodeOptions = [
        { value: NO_NODE, label: 'None' },
        ...(nodes.data?.items ?? []).map((node) => ({ value: String(node.id), label: node.name })),
    ];

    return (
        <>
            <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
                <Input id={`${idPrefix}-name`} aria-invalid={!!errors.name} {...form.register('name')} />
                <FieldDescription>
                    A short identifier used to distinguish this host from others, for example{' '}
                    <code className='font-mono text-xs'>us.nyc.lvl3</code>.
                </FieldDescription>
                <FieldError errors={[errors.name]} />
            </Field>
            <div className='grid items-start gap-6 md:grid-cols-2'>
                <Field data-invalid={!!errors.host}>
                    <FieldLabel htmlFor={`${idPrefix}-host`}>Host</FieldLabel>
                    <Input id={`${idPrefix}-host`} aria-invalid={!!errors.host} {...form.register('host')} />
                    <FieldDescription>
                        The IP address or FQDN that should be used when attempting to connect to this MySQL host from
                        the panel to add new databases.
                    </FieldDescription>
                    <FieldError errors={[errors.host]} />
                </Field>
                <Field data-invalid={!!errors.port}>
                    <FieldLabel htmlFor={`${idPrefix}-port`}>Port</FieldLabel>
                    <Input
                        id={`${idPrefix}-port`}
                        type='number'
                        aria-invalid={!!errors.port}
                        {...form.register('port')}
                    />
                    <FieldDescription>The port that MySQL is running on for this host.</FieldDescription>
                    <FieldError errors={[errors.port]} />
                </Field>
            </div>
            <div className='grid items-start gap-6 md:grid-cols-2'>
                <Field data-invalid={!!errors.username}>
                    <FieldLabel htmlFor={`${idPrefix}-username`}>Username</FieldLabel>
                    <Input
                        id={`${idPrefix}-username`}
                        autoComplete='off'
                        aria-invalid={!!errors.username}
                        {...form.register('username')}
                    />
                    <FieldDescription>
                        The username of an account that has enough permissions to create new users and databases on the
                        system.
                    </FieldDescription>
                    <FieldError errors={[errors.username]} />
                </Field>
                <Field data-invalid={!!errors.password}>
                    <FieldLabel htmlFor={`${idPrefix}-password`}>Password</FieldLabel>
                    <Input
                        id={`${idPrefix}-password`}
                        type='password'
                        autoComplete='new-password'
                        placeholder={isEditing ? 'Leave blank to keep the current password' : ''}
                        aria-invalid={!!errors.password}
                        {...form.register('password')}
                    />
                    <FieldDescription>
                        {isEditing
                            ? 'The password to the account defined. Leave blank to continue using the assigned password.'
                            : 'The password to the account defined.'}
                    </FieldDescription>
                    <FieldError errors={[errors.password]} />
                </Field>
            </div>
            <Field>
                <FieldLabel htmlFor={`${idPrefix}-node`}>Linked node</FieldLabel>
                <Controller
                    control={form.control}
                    name='nodeId'
                    render={({ field }) => (
                        <Select
                            items={nodeOptions}
                            value={field.value}
                            onValueChange={(value) => value && field.onChange(String(value))}
                        >
                            <SelectTrigger id={`${idPrefix}-node`} className='w-full'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {nodeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                <FieldDescription>
                    This setting does nothing other than default to this database host when adding a database to a
                    server on the selected node.
                </FieldDescription>
            </Field>
        </>
    );
};

export { databaseHostSchema, DatabaseHostFields, NO_NODE, toDatabaseHostBody };
export type { DatabaseHostFormValues };
