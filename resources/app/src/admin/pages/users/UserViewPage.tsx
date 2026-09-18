import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';

import { deleteUser, getUserServers, invalidateUsers, updateUser, userQueryOptions } from '@/admin/api/users';
import { UserForm } from '@/admin/components/users/UserForm';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { httpErrorToHuman } from '@/lib/http';
import { sessionUser } from '@/lib/session';

const UserViewPage: React.FC = () => {
    const { userId } = useParams({ from: '/admin/users/view/$userId' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const user = useQuery(userQueryOptions(userId));
    const attributes = user.data;
    const isSelf = !!attributes && attributes.uuid === sessionUser?.uuid;
    const servers = attributes ? getUserServers(attributes) : [];

    const update = useMutation({
        mutationFn: (payload: Parameters<typeof updateUser>[1]) => updateUser(Number(userId), payload),
        onSuccess: () => {
            toast.success('Account has been successfully updated.');

            return invalidateUsers(queryClient);
        },
    });

    const remove = useMutation({
        mutationFn: () => deleteUser(Number(userId)),
        onSuccess: () => {
            toast.success('User has been deleted.');
            queryClient.invalidateQueries({ queryKey: ['admin', '/users'] });
            navigate({ to: '/admin/users' });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    return (
        <>
            <PageHeader title={attributes ? `Manage user: ${attributes.username}` : 'Manage user'}>
                <Button size='sm' variant='outline' render={<Link to='/admin/users' />}>
                    Back
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 p-4'>
                <FormError message={user.error ? httpErrorToHuman(user.error) : null} />
                {user.isPending && <Skeleton className='h-96 rounded-xl' />}
                {attributes && (
                    <>
                        <div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
                            <span>
                                {attributes.first_name} {attributes.last_name}
                            </span>
                            <code className='rounded bg-muted px-1 font-mono text-xs'>{attributes.uuid}</code>
                            {attributes.root_admin && <Badge variant='secondary'>Administrator</Badge>}
                            {attributes['2fa'] && <Badge variant='secondary'>2FA enabled</Badge>}
                        </div>
                        <UserForm
                            mode='edit'
                            isSelf={isSelf}
                            defaultValues={{
                                email: attributes.email,
                                username: attributes.username,
                                first_name: attributes.first_name,
                                last_name: attributes.last_name,
                                language: attributes.language,
                                root_admin: attributes.root_admin,
                                password: '',
                            }}
                            isPending={update.isPending}
                            error={update.error}
                            onSubmit={(payload) => update.mutate(payload)}
                        />
                        <Card>
                            <CardHeader>
                                <CardTitle>Servers owned</CardTitle>
                                <CardDescription>
                                    Servers that this user is marked as the owner of. There must be no servers
                                    associated with this account in order for it to be deleted.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {servers.length === 0 ? (
                                    <Empty className='border'>
                                        <EmptyHeader>
                                            <EmptyTitle>No servers</EmptyTitle>
                                            <EmptyDescription>This user does not own any servers.</EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                ) : (
                                    <div className='overflow-hidden rounded-xl border'>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className='w-16'>ID</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Identifier</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {servers.map((server) => (
                                                    <TableRow key={server.id}>
                                                        <TableCell>
                                                            <code className='font-mono text-xs text-muted-foreground'>
                                                                {server.id}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link
                                                                to='/admin/servers/view/$serverId'
                                                                params={{ serverId: String(server.id) }}
                                                                search={{ tab: 'about' }}
                                                                className='underline-offset-4 hover:underline'
                                                            >
                                                                {server.name}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className='font-mono text-xs text-muted-foreground'>
                                                                {server.identifier}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>
                                                            {server.suspended ? (
                                                                <Badge variant='destructive'>Suspended</Badge>
                                                            ) : (
                                                                <Badge variant='secondary'>
                                                                    {server.status ?? 'Installed'}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className='border-destructive/40'>
                            <CardHeader>
                                <CardTitle>Delete user</CardTitle>
                                <CardDescription>
                                    {isSelf
                                        ? 'You cannot delete your own account.'
                                        : 'There must be no servers associated with this account in order for it to be deleted.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='flex justify-end'>
                                <AlertDialog>
                                    <AlertDialogTrigger
                                        render={
                                            <Button
                                                variant='destructive'
                                                disabled={isSelf || servers.length > 0 || remove.isPending}
                                            />
                                        }
                                    >
                                        Delete user
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete {attributes.username}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This account will be permanently removed from the Panel. This action
                                                cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction variant='destructive' onClick={() => remove.mutate()}>
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    );
};

export { UserViewPage };
