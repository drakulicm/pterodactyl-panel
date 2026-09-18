import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
    databaseHostQueryOptions,
    deleteDatabaseHost,
    getHostDatabases,
    updateDatabaseHost,
} from '@/admin/api/databases';
import {
    databaseHostSchema,
    DatabaseHostFields,
    type DatabaseHostFormValues,
    NO_NODE,
    toDatabaseHostBody,
} from '@/admin/components/databases/DatabaseHostFields';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { httpErrorToHuman } from '@/lib/http';

const DatabaseHostPage: React.FC = () => {
    const { hostId } = useParams({ from: '/admin/databases/view/$hostId' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const host = useQuery(databaseHostQueryOptions(Number(hostId)));
    const attributes = host.data;
    const databases = attributes ? getHostDatabases(attributes) : [];

    const form = useForm<DatabaseHostFormValues>({
        resolver: zodResolver(databaseHostSchema),
        defaultValues: { name: '', host: '', port: '3306', username: '', password: '', nodeId: NO_NODE },
        values: attributes
            ? {
                  name: attributes.name,
                  host: attributes.host,
                  port: String(attributes.port),
                  username: attributes.username,
                  password: '',
                  nodeId: attributes.node === null ? NO_NODE : String(attributes.node),
              }
            : undefined,
    });

    const update = useMutation({
        mutationFn: (values: DatabaseHostFormValues) => updateDatabaseHost(Number(hostId), toDatabaseHostBody(values)),
        onSuccess: async (updated) => {
            toast.success(`${updated.name} has been updated.`);
            form.resetField('password');

            return queryClient.invalidateQueries({
                predicate: (query) => String(query.queryKey[1] ?? '').startsWith('/database-hosts'),
            });
        },
    });

    const remove = useMutation({
        mutationFn: () => deleteDatabaseHost(Number(hostId)),
        onSuccess: async () => {
            toast.success('The database host has been deleted.');
            queryClient.removeQueries({ queryKey: ['admin', `/database-hosts/${hostId}`] });
            await queryClient.invalidateQueries({ queryKey: ['admin', '/database-hosts'] });
            await navigate({ to: '/admin/databases' });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleSubmit = form.handleSubmit((values) => update.mutate(values));

    return (
        <>
            <PageHeader title={attributes ? attributes.name : 'Database host'}>
                <Button variant='outline' size='sm' nativeButton={false} render={<Link to='/admin/databases' />}>
                    Back to hosts
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={host.error ? httpErrorToHuman(host.error) : null} />
                {host.isPending && <Skeleton className='h-96 rounded-xl' />}
                {attributes && (
                    <>
                        <form onSubmit={handleSubmit} noValidate>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Host details</CardTitle>
                                    <CardDescription>
                                        The account defined for this database host must have the{' '}
                                        <code className='font-mono text-xs'>WITH GRANT OPTION</code> permission. Do not
                                        use the same account details for MySQL that you have defined for this panel.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <FieldGroup>
                                        <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                                        <DatabaseHostFields form={form} idPrefix='host-edit' isEditing />
                                    </FieldGroup>
                                </CardContent>
                                <CardFooter className='justify-between'>
                                    <AlertDialog>
                                        <AlertDialogTrigger
                                            render={
                                                <Button
                                                    type='button'
                                                    variant='destructive'
                                                    disabled={remove.isPending}
                                                />
                                            }
                                        >
                                            Delete host
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete database host</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Deleting {attributes.name} is permanent. A host that still has
                                                    databases linked to it cannot be deleted.
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
                                    <Button type='submit' disabled={update.isPending}>
                                        {update.isPending && <Spinner />}
                                        Save
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                        <Card>
                            <CardHeader>
                                <CardTitle>Databases</CardTitle>
                                <CardDescription>Server databases stored on this host.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {databases.length ? (
                                    <div className='overflow-hidden rounded-xl border'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Server</TableHead>
                                                    <TableHead>Database name</TableHead>
                                                    <TableHead>Username</TableHead>
                                                    <TableHead>Connections from</TableHead>
                                                    <TableHead>Max connections</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {databases.map((database) => (
                                                    <TableRow key={database.id}>
                                                        <TableCell>
                                                            <Link
                                                                to='/admin/servers/view/$serverId'
                                                                params={{ serverId: String(database.server) }}
                                                                search={{ tab: 'about' }}
                                                                className='hover:underline'
                                                            >
                                                                Server #{database.server}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>{database.database}</TableCell>
                                                        <TableCell>{database.username}</TableCell>
                                                        <TableCell>
                                                            <code className='rounded bg-muted px-2 py-1 font-mono text-xs'>
                                                                {database.remote}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>{database.max_connections || 'Unlimited'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Empty className='border'>
                                        <EmptyHeader>
                                            <EmptyTitle>No databases on this host</EmptyTitle>
                                        </EmptyHeader>
                                    </Empty>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    );
};

export { DatabaseHostPage };
