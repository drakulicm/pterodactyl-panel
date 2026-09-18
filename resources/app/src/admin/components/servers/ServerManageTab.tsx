import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    type AdminServer,
    formatAllocation,
    getLocationNodes,
    nodeAllocationsQueryOptions,
    reinstallServer,
    serverLocationsQueryOptions,
    suspendServer,
    toggleServerInstallStatus,
    transferServer,
    unsuspendServer,
} from '@/admin/api/servers';
import { AllocationCheckboxList } from '@/admin/components/servers/AllocationCheckboxList';
import { FormError } from '@/components/auth/FormError';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const TransferDialog: React.FC<{ server: AdminServer }> = ({ server }) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [nodeId, setNodeId] = useState('');
    const [allocationId, setAllocationId] = useState('');
    const [additional, setAdditional] = useState<number[]>([]);

    const locations = useQuery(serverLocationsQueryOptions);
    const allocations = useQuery(nodeAllocationsQueryOptions(nodeId ? Number(nodeId) : null, true));

    const locationItems = locations.data?.items ?? [];
    const otherNodes = locationItems.flatMap((location) =>
        getLocationNodes(location).filter((node) => node.id !== server.node),
    );
    const nodeItems = otherNodes.map((node) => ({ value: String(node.id), label: node.name }));
    const allocationItems = (allocations.data ?? []).map((allocation) => ({
        value: String(allocation.id),
        label: formatAllocation(allocation),
    }));
    const canTransfer = nodeItems.length > 0;

    const transfer = useMutation({
        mutationFn: () =>
            transferServer(server.id, {
                node_id: Number(nodeId),
                allocation_id: Number(allocationId),
                allocation_additional: additional,
            }),
        onSuccess: async () => {
            toast.success('The server has begun transferring to the selected node.');
            setIsOpen(false);
            await queryClient.invalidateQueries({ queryKey: ['admin', `/servers/${server.id}`] });
        },
    });

    const handleNodeChange = (value: string) => {
        setNodeId(value);
        setAllocationId('');
        setAdditional([]);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transfer server</CardTitle>
                <CardDescription>
                    Transfer this server to another node connected to this panel. <strong>Warning!</strong> This feature
                    has not been fully tested and may have bugs.
                </CardDescription>
            </CardHeader>
            <CardFooter className='flex-col items-start gap-2'>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger render={<Button variant='outline' disabled={!canTransfer} />}>
                        Transfer server
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Transfer server</DialogTitle>
                            <DialogDescription>
                                Select the node and allocations this server should be transferred to.
                            </DialogDescription>
                        </DialogHeader>
                        <div className='flex flex-col gap-6'>
                            <FormError message={transfer.error ? httpErrorToHuman(transfer.error) : null} />
                            <Field>
                                <FieldLabel htmlFor='transfer-node'>Node</FieldLabel>
                                <Select
                                    items={nodeItems}
                                    value={nodeId || null}
                                    onValueChange={(value) => value && handleNodeChange(String(value))}
                                >
                                    <SelectTrigger id='transfer-node' className='w-full'>
                                        <SelectValue placeholder='Select a node' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locationItems.map((location) => (
                                            <SelectGroup key={location.id}>
                                                <SelectLabel>
                                                    {location.long} ({location.short})
                                                </SelectLabel>
                                                {getLocationNodes(location)
                                                    .filter((node) => node.id !== server.node)
                                                    .map((node) => (
                                                        <SelectItem key={node.id} value={String(node.id)}>
                                                            {node.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>The node which this server will be transferred to.</FieldDescription>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='transfer-allocation'>Default allocation</FieldLabel>
                                <Select
                                    items={allocationItems}
                                    value={allocationId || null}
                                    onValueChange={(value) => value && setAllocationId(String(value))}
                                >
                                    <SelectTrigger id='transfer-allocation' className='w-full'>
                                        <SelectValue placeholder='Select an allocation' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allocationItems.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>
                                    The main allocation that will be assigned to this server.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <FieldLabel>Additional allocation(s)</FieldLabel>
                                <AllocationCheckboxList
                                    allocations={(allocations.data ?? []).filter(
                                        (allocation) => String(allocation.id) !== allocationId,
                                    )}
                                    selected={additional}
                                    emptyMessage='Select a node with unassigned allocations first.'
                                    onChange={setAdditional}
                                />
                                <FieldDescription>
                                    Additional allocations to assign to this server on creation.
                                </FieldDescription>
                            </Field>
                        </div>
                        <DialogFooter>
                            <Button variant='outline' onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                disabled={!nodeId || !allocationId || transfer.isPending}
                                onClick={() => transfer.mutate()}
                            >
                                {transfer.isPending && <Spinner />}
                                Confirm
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {!canTransfer && (
                    <p className='text-sm text-muted-foreground'>
                        Transferring a server requires more than one node to be configured on your panel.
                    </p>
                )}
            </CardFooter>
        </Card>
    );
};

const ServerManageTab: React.FC<{ server: AdminServer }> = ({ server }) => {
    const queryClient = useQueryClient();
    const isInstalled = server.container.installed === 1;
    const canBeReinstalled =
        !server.container.skip_scripts ||
        ['installing', 'install_failed', 'reinstall_failed'].includes(server.status ?? '');

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', `/servers/${server.id}`] });

    const reinstall = useMutation({
        mutationFn: () => reinstallServer(server.id),
        onSuccess: async () => {
            toast.success('The server has been queued for a reinstall.');
            await invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const toggleInstall = useMutation({
        mutationFn: () => toggleServerInstallStatus(server.id),
        onSuccess: async () => {
            toast.success('The install status of this server has been toggled.');
            await invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const suspension = useMutation({
        mutationFn: () => (server.suspended ? unsuspendServer(server.id) : suspendServer(server.id)),
        onSuccess: async () => {
            toast.success(server.suspended ? 'The server has been unsuspended.' : 'The server has been suspended.');
            await invalidate();
            await queryClient.invalidateQueries({ queryKey: ['admin', '/servers'] });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    if (server.status === 'install_failed') {
        return (
            <Alert variant='destructive'>
                <TriangleAlertIcon />
                <AlertTitle>This server is in a failed install state</AlertTitle>
                <AlertDescription>
                    This server is in a failed install state and cannot be recovered. Please delete and re-create the
                    server.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className='grid gap-4 md:grid-cols-2'>
            <Card>
                <CardHeader>
                    <CardTitle>Reinstall server</CardTitle>
                    <CardDescription>
                        This will reinstall the server with the assigned service scripts. <strong>Danger!</strong> This
                        could overwrite server data.
                    </CardDescription>
                </CardHeader>
                <CardFooter className='flex-col items-start gap-2'>
                    <AlertDialog>
                        <AlertDialogTrigger
                            render={
                                <Button
                                    variant='destructive'
                                    disabled={!canBeReinstalled || !isInstalled || reinstall.isPending}
                                />
                            }
                        >
                            {reinstall.isPending && <Spinner />}
                            Reinstall server
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reinstall this server?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    The server will be stopped and reinstalled with the assigned service scripts. This
                                    could overwrite server data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction variant='destructive' onClick={() => reinstall.mutate()}>
                                    Reinstall
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {!canBeReinstalled && (
                        <p className='text-sm text-muted-foreground'>
                            This server is set to skip its install script. Disable &quot;Skip egg install script&quot; on
                            the startup page to reinstall it.
                        </p>
                    )}
                    {canBeReinstalled && !isInstalled && (
                        <p className='text-sm text-muted-foreground'>
                            Server must install properly to be reinstalled.
                        </p>
                    )}
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Install status</CardTitle>
                    <CardDescription>
                        If you need to change the install status from uninstalled to installed, or vice versa, you may do
                        so with the button below.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger render={<Button disabled={toggleInstall.isPending} />}>
                            {toggleInstall.isPending && <Spinner />}
                            Toggle install status
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Toggle the install status?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This flips the server between the installed and installing states. It does not run an
                                    install.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => toggleInstall.mutate()}>Toggle</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{server.suspended ? 'Unsuspend server' : 'Suspend server'}</CardTitle>
                    <CardDescription>
                        {server.suspended
                            ? 'This will unsuspend the server and restore normal user access.'
                            : 'This will suspend the server, stop any running processes, and immediately block the user from being able to access their files or otherwise manage the server through the panel or API.'}
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger
                            render={
                                <Button
                                    variant={server.suspended ? 'default' : 'destructive'}
                                    disabled={suspension.isPending}
                                />
                            }
                        >
                            {suspension.isPending && <Spinner />}
                            {server.suspended ? 'Unsuspend server' : 'Suspend server'}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {server.suspended ? 'Unsuspend this server?' : 'Suspend this server?'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {server.suspended
                                        ? 'Normal user access to this server will be restored.'
                                        : 'Any running processes will be stopped and the user will immediately lose access to this server.'}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    variant={server.suspended ? 'default' : 'destructive'}
                                    onClick={() => suspension.mutate()}
                                >
                                    {server.suspended ? 'Unsuspend' : 'Suspend'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>

            <TransferDialog server={server} />
        </div>
    );
};

export { ServerManageTab };
