import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
    addMountEggs,
    addMountNodes,
    deleteMount,
    detachMountEgg,
    detachMountNode,
    getMountEggs,
    getMountNodes,
    getMountServers,
    invalidateMounts,
    mountableNodesQueryOptions,
    mountQueryOptions,
    updateMount,
} from '@/admin/api/mounts';
import { getNestEggs, nestsQueryOptions } from '@/admin/api/nests';
import { AttachDialog, type AttachOption } from '@/admin/components/mounts/AttachDialog';
import { MountFields, mountSchema, type MountFormValues } from '@/admin/components/mounts/MountFields';
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
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { httpErrorToHuman } from '@/lib/http';

const MountViewPage: React.FC = () => {
    const { mountId } = useParams({ from: '/admin/mounts/view/$mountId' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isEggDialogOpen, setIsEggDialogOpen] = useState(false);
    const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);

    const mount = useQuery(mountQueryOptions(mountId));
    const nests = useQuery(nestsQueryOptions({ page: 1 }));
    const nodes = useQuery(mountableNodesQueryOptions);

    const attributes = mount.data;
    const attachedEggs = attributes ? getMountEggs(attributes) : [];
    const attachedNodes = attributes ? getMountNodes(attributes) : [];
    const attachedServers = attributes ? getMountServers(attributes) : [];

    const form = useForm({
        resolver: zodResolver(mountSchema),
        defaultValues: { name: '', description: '', source: '', target: '', read_only: false, user_mountable: false },
        values: attributes
            ? {
                  name: attributes.name,
                  description: attributes.description ?? '',
                  source: attributes.source,
                  target: attributes.target,
                  read_only: attributes.read_only,
                  user_mountable: attributes.user_mountable,
              }
            : undefined,
    });

    const invalidate = () => invalidateMounts(queryClient);

    const update = useMutation({
        mutationFn: (values: MountFormValues) =>
            updateMount(Number(mountId), { ...values, description: values.description.trim() || null }),
        onSuccess: () => {
            toast.success('Mount was updated successfully.');

            return invalidate();
        },
    });

    const attachEggs = useMutation({
        mutationFn: (eggs: number[]) => addMountEggs(Number(mountId), eggs),
        onSuccess: () => {
            toast.success('Mount was updated successfully.');
            setIsEggDialogOpen(false);

            return invalidate();
        },
    });

    const attachNodes = useMutation({
        mutationFn: (nodeIds: number[]) => addMountNodes(Number(mountId), nodeIds),
        onSuccess: () => {
            toast.success('Mount was updated successfully.');
            setIsNodeDialogOpen(false);

            return invalidate();
        },
    });

    const detachEgg = useMutation({
        mutationFn: (eggId: number) => detachMountEgg(Number(mountId), eggId),
        onSuccess: () => {
            toast.success('Egg detached.');

            return invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const detachNode = useMutation({
        mutationFn: (nodeId: number) => detachMountNode(Number(mountId), nodeId),
        onSuccess: () => {
            toast.success('Node detached.');

            return invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const remove = useMutation({
        mutationFn: () => deleteMount(Number(mountId)),
        onSuccess: () => {
            toast.success('Mount has been deleted.');
            queryClient.invalidateQueries({ queryKey: ['admin', '/mounts'] });
            navigate({ to: '/admin/mounts' });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const eggOptions: AttachOption[] = (nests.data?.items ?? []).flatMap((nest) =>
        getNestEggs(nest)
            .filter((egg) => !attachedEggs.some((attached) => attached.id === egg.id))
            .map((egg) => ({ id: egg.id, label: egg.name, group: nest.name })),
    );

    const nodeOptions: AttachOption[] = (nodes.data?.items ?? [])
        .filter((node) => !attachedNodes.some((attached) => attached.id === node.id))
        .map((node) => ({
            id: node.id,
            label: node.name,
            hint: node.fqdn,
            group: node.relationships?.location?.attributes.short ?? 'Unknown location',
        }));

    return (
        <>
            <PageHeader title={attributes ? `Mount: ${attributes.name}` : 'Mount'}>
                <Button size='sm' variant='outline' render={<Link to='/admin/mounts' />}>
                    Back
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 p-4'>
                <FormError message={mount.error ? httpErrorToHuman(mount.error) : null} />
                {mount.isPending && <Skeleton className='h-96 rounded-xl' />}
                {attributes && (
                    <>
                        <p className='text-sm text-muted-foreground'>
                            <code className='rounded bg-muted px-1 font-mono text-xs'>{attributes.uuid}</code>
                        </p>
                        <form onSubmit={form.handleSubmit((values) => update.mutate(values))} noValidate>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Mount details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FieldGroup>
                                        <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                                        <MountFields form={form} idPrefix='mount' />
                                    </FieldGroup>
                                </CardContent>
                                <CardFooter className='justify-end'>
                                    <Button type='submit' disabled={update.isPending}>
                                        {update.isPending && <Spinner />}
                                        Save
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                        <div className='grid items-start gap-4 lg:grid-cols-2'>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Eggs</CardTitle>
                                    <CardDescription>
                                        Servers using one of these eggs may use this mount.
                                    </CardDescription>
                                    <div className='ml-auto'>
                                        <AttachDialog
                                            title='Add eggs'
                                            description='Select the eggs that should have access to this mount.'
                                            emptyLabel='Every egg is already attached to this mount.'
                                            trigger={
                                                <Button size='sm' variant='outline'>
                                                    <PlusIcon />
                                                    Add eggs
                                                </Button>
                                            }
                                            options={eggOptions}
                                            isOpen={isEggDialogOpen}
                                            isPending={attachEggs.isPending}
                                            error={attachEggs.error}
                                            onOpenChange={setIsEggDialogOpen}
                                            onSubmit={(ids) => attachEggs.mutate(ids)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {attachedEggs.length === 0 ? (
                                        <p className='text-sm text-muted-foreground'>No eggs are attached.</p>
                                    ) : (
                                        <div className='overflow-hidden rounded-xl border'>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className='w-16'>ID</TableHead>
                                                        <TableHead>Name</TableHead>
                                                        <TableHead className='w-12' />
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {attachedEggs.map((egg) => (
                                                        <TableRow key={egg.id}>
                                                            <TableCell>
                                                                <code className='font-mono text-xs text-muted-foreground'>
                                                                    {egg.id}
                                                                </code>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Link
                                                                    to='/admin/nests/egg/$eggId'
                                                                    params={{ eggId: String(egg.id) }}
                                                                    className='underline-offset-4 hover:underline'
                                                                >
                                                                    {egg.name}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant='ghost'
                                                                    size='icon-sm'
                                                                    aria-label={`Detach ${egg.name}`}
                                                                    disabled={detachEgg.isPending}
                                                                    onClick={() => detachEgg.mutate(egg.id)}
                                                                >
                                                                    <Trash2Icon className='text-destructive' />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Nodes</CardTitle>
                                    <CardDescription>
                                        Servers on one of these nodes may use this mount.
                                    </CardDescription>
                                    <div className='ml-auto'>
                                        <AttachDialog
                                            title='Add nodes'
                                            description='Select the nodes that should have access to this mount.'
                                            emptyLabel='Every node is already attached to this mount.'
                                            trigger={
                                                <Button size='sm' variant='outline'>
                                                    <PlusIcon />
                                                    Add nodes
                                                </Button>
                                            }
                                            options={nodeOptions}
                                            isOpen={isNodeDialogOpen}
                                            isPending={attachNodes.isPending}
                                            error={attachNodes.error}
                                            onOpenChange={setIsNodeDialogOpen}
                                            onSubmit={(ids) => attachNodes.mutate(ids)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {attachedNodes.length === 0 ? (
                                        <p className='text-sm text-muted-foreground'>No nodes are attached.</p>
                                    ) : (
                                        <div className='overflow-hidden rounded-xl border'>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className='w-16'>ID</TableHead>
                                                        <TableHead>Name</TableHead>
                                                        <TableHead>FQDN</TableHead>
                                                        <TableHead className='w-12' />
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {attachedNodes.map((node) => (
                                                        <TableRow key={node.id}>
                                                            <TableCell>
                                                                <code className='font-mono text-xs text-muted-foreground'>
                                                                    {node.id}
                                                                </code>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Link
                                                                    to='/admin/nodes/view/$nodeId'
                                                                    params={{ nodeId: String(node.id) }}
                                                                    search={{ tab: 'about' }}
                                                                    className='underline-offset-4 hover:underline'
                                                                >
                                                                    {node.name}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell>
                                                                <code className='font-mono text-xs text-muted-foreground'>
                                                                    {node.fqdn}
                                                                </code>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant='ghost'
                                                                    size='icon-sm'
                                                                    aria-label={`Detach ${node.name}`}
                                                                    disabled={detachNode.isPending}
                                                                    onClick={() => detachNode.mutate(node.id)}
                                                                >
                                                                    <Trash2Icon className='text-destructive' />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                        <Card className='border-destructive/40'>
                            <CardHeader>
                                <CardTitle>Delete mount</CardTitle>
                                <CardDescription>
                                    {attachedServers.length > 0
                                        ? `This mount is currently used by ${attachedServers.length} server(s) and cannot be deleted until they stop using it.`
                                        : 'Deleting this mount detaches it from every egg and node it is assigned to.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className='flex justify-end'>
                                <AlertDialog>
                                    <AlertDialogTrigger
                                        render={
                                            <Button
                                                variant='destructive'
                                                disabled={attachedServers.length > 0 || remove.isPending}
                                            />
                                        }
                                    >
                                        Delete mount
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete {attributes.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This mount will be permanently removed from the Panel. This action
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

export { MountViewPage };
