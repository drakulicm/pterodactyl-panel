import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { HardDriveIcon, PlusIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { type AdminServer, attachServerMount, detachServerMount, serverMountsQueryOptions } from '@/admin/api/servers';
import { FormError } from '@/components/auth/FormError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { httpErrorToHuman } from '@/lib/http';

const ServerMountsTab: React.FC<{ server: AdminServer }> = ({ server }) => {
    const queryClient = useQueryClient();
    const mounts = useQuery(serverMountsQueryOptions(server.id));

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', `/servers/${server.id}/mounts`] });

    const attach = useMutation({
        mutationFn: (mountId: number) => attachServerMount(server.id, mountId),
        onSuccess: async () => {
            toast.success('The mount has been attached to this server.');
            await invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const detach = useMutation({
        mutationFn: (mountId: number) => detachServerMount(server.id, mountId),
        onSuccess: async () => {
            toast.success('The mount has been detached from this server.');
            await invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Available mounts</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
                <FormError message={mounts.error ? httpErrorToHuman(mounts.error) : null} />
                {mounts.isPending ? (
                    <Skeleton className='h-48 rounded-xl' />
                ) : mounts.data && mounts.data.mounts.length > 0 ? (
                    <div className='overflow-hidden rounded-xl border'>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-16'>ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className='w-12' />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mounts.data.mounts.map((mount) => {
                                    const isMounted = mounts.data.mounted.includes(mount.id);

                                    return (
                                        <TableRow key={mount.id}>
                                            <TableCell>
                                                <code className='rounded bg-muted px-1 font-mono text-xs'>
                                                    {mount.id}
                                                </code>
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    to='/admin/mounts/view/$mountId'
                                                    params={{ mountId: String(mount.id) }}
                                                    className='text-primary hover:underline'
                                                >
                                                    {mount.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <code className='font-mono text-xs'>{mount.source}</code>
                                            </TableCell>
                                            <TableCell>
                                                <code className='font-mono text-xs'>{mount.target}</code>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={isMounted ? 'default' : 'secondary'}>
                                                    {isMounted ? 'Mounted' : 'Unmounted'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                {isMounted ? (
                                                    <Button
                                                        variant='destructive'
                                                        size='icon-sm'
                                                        aria-label={`Detach ${mount.name}`}
                                                        disabled={detach.isPending}
                                                        onClick={() => detach.mutate(mount.id)}
                                                    >
                                                        <XIcon />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant='outline'
                                                        size='icon-sm'
                                                        aria-label={`Attach ${mount.name}`}
                                                        disabled={attach.isPending}
                                                        onClick={() => attach.mutate(mount.id)}
                                                    >
                                                        <PlusIcon />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    !mounts.error && (
                        <Empty className='border'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon'>
                                    <HardDriveIcon />
                                </EmptyMedia>
                                <EmptyTitle>No mounts available</EmptyTitle>
                                <EmptyDescription>
                                    A mount is only available to this server when it is attached to both the
                                    server&apos;s egg and its node.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                )}
            </CardContent>
        </Card>
    );
};

export { ServerMountsTab };
