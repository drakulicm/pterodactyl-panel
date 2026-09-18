import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InfoIcon, RefreshCwIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    type AdminServer,
    type AdminServerDatabase,
    createServerDatabase,
    databaseHostsQueryOptions,
    deleteServerDatabase,
    resetServerDatabasePassword,
    serverDatabasesQueryOptions,
} from '@/admin/api/servers';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { FormError } from '@/components/auth/FormError';
import { ConfirmDeleteButton } from '@/components/layout/ConfirmDeleteButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    host: z.string().min(1, 'A database host must be selected.'),
    database: z
        .string()
        .min(1, 'A database name is required.')
        .max(48, 'The database name may not exceed 48 characters.')
        .regex(/^[\w-]+$/, 'The database name may only contain letters, numbers, dashes and underscores.'),
    remote: z
        .string()
        .min(1, 'A connection string is required.')
        .regex(/^[0-9%.]{1,15}$/, 'The connection string must use standard MySQL notation, for example % or 127.0.0.1.'),
});

type FormValues = z.infer<typeof schema>;

const ServerDatabaseTab: React.FC<{ server: AdminServer }> = ({ server }) => {
    const queryClient = useQueryClient();
    const databases = useQuery(serverDatabasesQueryOptions(server.id));
    const hosts = useQuery(databaseHostsQueryOptions);

    const hostItems = (hosts.data?.items ?? []).map((host) => ({ value: String(host.id), label: host.name }));

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { host: '', database: '', remote: '%' },
    });
    const { errors } = form.formState;
    const host = form.watch('host');

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', `/servers/${server.id}/databases`] });

    const create = useMutation({
        mutationFn: (values: FormValues) =>
            createServerDatabase(server.id, {
                database: values.database,
                remote: values.remote,
                host: Number(values.host),
            }),
        onSuccess: async () => {
            toast.success('A new database has been created for this server.');
            form.reset({ host, database: '', remote: '%' });
            await invalidate();
        },
    });

    const resetPassword = useMutation({
        mutationFn: (databaseId: number) => resetServerDatabasePassword(server.id, databaseId),
        onSuccess: () => toast.success('The password for this database has been reset.'),
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const remove = useMutation({
        mutationFn: (databaseId: number) => deleteServerDatabase(server.id, databaseId),
        onSuccess: async () => {
            toast.success('The database has been deleted.');
            await invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const columns: AdminColumn<AdminServerDatabase>[] = [
        { header: 'Database', cell: (database) => <span className='font-medium'>{database.database}</span> },
        { header: 'Username', cell: (database) => database.username },
        { header: 'Connections from', cell: (database) => <code className='font-mono text-xs'>{database.remote}</code> },
        {
            header: 'Host',
            cell: (database) => {
                const databaseHost = database.relationships?.host?.attributes;

                return databaseHost ? (
                    <code className='rounded bg-muted px-1 font-mono text-xs'>
                        {databaseHost.host}:{databaseHost.port}
                    </code>
                ) : (
                    <span className='text-muted-foreground'>—</span>
                );
            },
        },
        {
            header: 'Max connections',
            cell: (database) => database.max_connections ?? 'Unlimited',
        },
        {
            header: '',
            className: 'w-24 text-right',
            cell: (database) => (
                <span className='flex items-center justify-end gap-1'>
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label='Reset database password'
                        disabled={resetPassword.isPending}
                        onClick={() => resetPassword.mutate(database.id)}
                    >
                        <RefreshCwIcon />
                    </Button>
                    <ConfirmDeleteButton
                        title='Delete this database?'
                        description='Are you sure that you want to delete this database? There is no going back, all data will immediately be removed.'
                        label='Delete database'
                        onConfirm={() => remove.mutate(database.id)}
                    />
                </span>
            ),
        },
    ];

    const handleSubmit = form.handleSubmit((values) => create.mutate(values));

    return (
        <div className='grid gap-4 lg:grid-cols-5'>
            <div className='flex flex-col gap-4 lg:col-span-3'>
                <Alert>
                    <InfoIcon />
                    <AlertDescription>
                        Database passwords can be viewed when{' '}
                        <a
                            href={`/server/${server.identifier}/databases`}
                            target='_blank'
                            rel='noreferrer'
                            className='text-primary underline-offset-4 hover:underline'
                        >
                            visiting this server
                        </a>{' '}
                        on the front-end.
                    </AlertDescription>
                </Alert>
                <Card>
                    <CardHeader>
                        <CardTitle>Active databases</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AdminDataTable
                            query={databases}
                            columns={columns}
                            getRowKey={(database) => database.id}
                            emptyTitle='No databases'
                            emptyDescription='This server does not have any databases yet.'
                        />
                    </CardContent>
                </Card>
            </div>
            <form onSubmit={handleSubmit} noValidate className='lg:col-span-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Create new database</CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col gap-6'>
                        <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                        <Field data-invalid={!!errors.host}>
                            <FieldLabel htmlFor='database-host'>Database host</FieldLabel>
                            {hostItems.length === 0 ? (
                                <p className='rounded-lg border p-3 text-sm text-muted-foreground'>
                                    No database hosts have been configured on this panel yet.
                                </p>
                            ) : (
                                <Select
                                    items={hostItems}
                                    value={host || null}
                                    onValueChange={(value) =>
                                        value && form.setValue('host', String(value), { shouldValidate: true })
                                    }
                                >
                                    <SelectTrigger id='database-host' className='w-full'>
                                        <SelectValue placeholder='Select a database host' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {hostItems.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <FieldDescription>
                                Select the host database server that this database should be created on.
                            </FieldDescription>
                            <FieldError errors={[errors.host]} />
                        </Field>
                        <Field data-invalid={!!errors.database}>
                            <FieldLabel htmlFor='database-name'>Database</FieldLabel>
                            <InputGroup>
                                <InputGroupAddon>s{server.id}_</InputGroupAddon>
                                <InputGroupInput
                                    id='database-name'
                                    placeholder='database'
                                    aria-invalid={!!errors.database}
                                    {...form.register('database')}
                                />
                            </InputGroup>
                            <FieldError errors={[errors.database]} />
                        </Field>
                        <Field data-invalid={!!errors.remote}>
                            <FieldLabel htmlFor='database-remote'>Connections</FieldLabel>
                            <Input id='database-remote' aria-invalid={!!errors.remote} {...form.register('remote')} />
                            <FieldDescription>
                                This should reflect the IP address that connections are allowed from. Uses standard MySQL
                                notation. If unsure leave as <code className='font-mono'>%</code>.
                            </FieldDescription>
                            <FieldError errors={[errors.remote]} />
                        </Field>
                        <FieldDescription>
                            A username and password for this database will be randomly generated after form submission.
                        </FieldDescription>
                    </CardContent>
                    <CardFooter className='justify-end'>
                        <Button type='submit' disabled={create.isPending || hostItems.length === 0}>
                            {create.isPending && <Spinner />}
                            Create database
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export { ServerDatabaseTab };
