import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    type AdminNodeAllocation,
    createNodeAllocations,
    deleteNodeAllocation,
    deleteNodeAllocations,
    nodeAllocationIpsQueryOptions,
    nodeAllocationsQueryOptions,
    updateNodeAllocationAlias,
} from '@/admin/api/nodes';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { FormError } from '@/components/auth/FormError';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const PORT_FLOOR = 1024;
const PORT_CEIL = 65535;
const PORT_RANGE_LIMIT = 1000;
const ALL_IPS = 'all';

const parsePorts = (value: string): string[] => value.split(/[\s,]+/).filter((entry) => entry.length > 0);

const portsIssue = (value: string): string | null => {
    const entries = parsePorts(value);

    if (entries.length === 0) {
        return 'At least one port must be provided.';
    }

    for (const entry of entries) {
        const range = /^(\d{4,5})-(\d{4,5})$/.exec(entry);

        if (range) {
            const start = Number(range[1]);
            const end = Number(range[2]);

            if (end < start) {
                return `The mapping provided for ${entry} was invalid and could not be processed.`;
            }

            if (end - start + 1 > PORT_RANGE_LIMIT) {
                return 'Adding more than 1000 ports in a single range at once is not supported.';
            }

            if (start <= PORT_FLOOR || end > PORT_CEIL) {
                return 'Ports in an allocation must be greater than 1024 and less than or equal to 65535.';
            }

            continue;
        }

        if (!/^\d+$/.test(entry)) {
            return `The mapping provided for ${entry} was invalid and could not be processed.`;
        }

        if (Number(entry) <= PORT_FLOOR || Number(entry) > PORT_CEIL) {
            return 'Ports in an allocation must be greater than 1024 and less than or equal to 65535.';
        }
    }

    return null;
};

const schema = z.object({
    ip: z.string().min(1, 'An IP address is required.'),
    alias: z.string().max(191, 'The alias may not exceed 191 characters.'),
    ports: z.string().superRefine((value, ctx) => {
        const issue = portsIssue(value);

        if (issue) {
            ctx.addIssue({ code: 'custom', message: issue });
        }
    }),
});

type FormValues = z.infer<typeof schema>;

const AllocationAliasInput: React.FC<{
    nodeId: number;
    allocation: AdminNodeAllocation;
}> = ({ nodeId, allocation }) => {
    const queryClient = useQueryClient();
    const [value, setValue] = useState(allocation.alias ?? '');

    const update = useMutation({
        mutationFn: (alias: string) => updateNodeAllocationAlias(nodeId, allocation.id, alias.length ? alias : null),
        onSuccess: () => {
            toast.success('The allocation alias has been updated.');

            return queryClient.invalidateQueries({ queryKey: ['admin', `/nodes/${nodeId}/allocations`] });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleBlur = () => {
        if (value === (allocation.alias ?? '')) {
            return;
        }

        update.mutate(value);
    };

    return (
        <Input
            value={value}
            placeholder='none'
            aria-label={`Alias for ${allocation.ip}:${allocation.port}`}
            className='h-7'
            disabled={update.isPending}
            onChange={(event) => setValue(event.target.value)}
            onBlur={handleBlur}
        />
    );
};

const AllocationDeleteButton: React.FC<{
    allocation: AdminNodeAllocation;
    onConfirm: () => void;
}> = ({ allocation, onConfirm }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleConfirm = () => {
        setIsOpen(false);
        onConfirm();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger
                render={
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label={`Delete ${allocation.ip}:${allocation.port}`}
                    />
                }
            >
                <Trash2Icon />
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete this allocation?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {allocation.ip}:{allocation.port} will no longer be available to servers on this node.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant='destructive' onClick={handleConfirm}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const NodeAllocationsTab: React.FC<{
    nodeId: number;
}> = ({ nodeId }) => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [ipFilter, setIpFilter] = useState(ALL_IPS);
    const [isUnassignedOnly, setIsUnassignedOnly] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [blockIp, setBlockIp] = useState<string | null>(null);
    const [isBlockOpen, setIsBlockOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    const query = useQuery(
        nodeAllocationsQueryOptions(nodeId, {
            page,
            ip: ipFilter === ALL_IPS ? undefined : ipFilter,
            isUnassignedOnly,
        }),
    );
    const ips = useQuery(nodeAllocationIpsQueryOptions(nodeId));
    const ipItems = [{ value: ALL_IPS, label: 'All IP addresses' }].concat(
        (ips.data ?? []).map((ip) => ({ value: ip, label: ip })),
    );

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', `/nodes/${nodeId}/allocations`] });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: { ip: '', alias: '', ports: '' },
    });
    const { errors } = form.formState;

    const create = useMutation({
        mutationFn: (values: FormValues) =>
            createNodeAllocations(nodeId, {
                ip: values.ip,
                alias: values.alias.length > 0 ? values.alias : null,
                ports: parsePorts(values.ports),
            }),
        onSuccess: async () => {
            toast.success('New allocations have been assigned to this node.');
            form.reset({ ip: form.getValues('ip'), alias: '', ports: '' });

            return invalidate();
        },
    });

    const removeOne = useMutation({
        mutationFn: (allocationId: number) => deleteNodeAllocation(nodeId, allocationId),
        onSuccess: async () => {
            toast.success('The allocation has been deleted.');

            return invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const removeMany = useMutation({
        mutationFn: (body: { ids: number[] } | { ip: string }) => deleteNodeAllocations(nodeId, body),
        onSuccess: async (deleted) => {
            toast.success(`${deleted} allocation${deleted === 1 ? ' has' : 's have'} been deleted.`);
            setSelected([]);
            setIsBlockOpen(false);
            setIsBulkOpen(false);

            return invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleToggle = (allocationId: number, isChecked: boolean) =>
        setSelected((current) =>
            isChecked ? [...current, allocationId] : current.filter((id) => id !== allocationId),
        );

    const handleIpFilterChange = (value: string) => {
        setIpFilter(value);
        setSelected([]);
        setPage(1);
    };

    const handleUnassignedChange = (isChecked: boolean) => {
        setIsUnassignedOnly(isChecked);
        setSelected([]);
        setPage(1);
    };

    const handleSubmit = form.handleSubmit((values) => create.mutate(values));

    const columns: AdminColumn<AdminNodeAllocation>[] = [
        {
            header: '',
            className: 'w-10',
            cell: (allocation) => (
                <Checkbox
                    checked={selected.includes(allocation.id)}
                    disabled={allocation.assigned}
                    aria-label={`Select ${allocation.ip}:${allocation.port}`}
                    onCheckedChange={(isChecked) => handleToggle(allocation.id, isChecked === true)}
                />
            ),
        },
        { header: 'IP address', cell: (allocation) => <span className='font-mono text-xs'>{allocation.ip}</span> },
        {
            header: 'IP alias',
            className: 'w-56',
            cell: (allocation) => <AllocationAliasInput nodeId={nodeId} allocation={allocation} />,
        },
        {
            header: 'Port',
            cell: (allocation) => <span className='font-mono text-xs tabular-nums'>{allocation.port}</span>,
        },
        {
            header: 'Assigned to',
            cell: (allocation) => {
                const server = allocation.relationships?.server?.attributes;

                if (!server) {
                    return <span className='text-muted-foreground'>Unassigned</span>;
                }

                return (
                    <Link
                        to='/admin/servers/view/$serverId'
                        params={{ serverId: String(server.id) }}
                        search={{ tab: 'about' }}
                        className='hover:underline'
                    >
                        {server.name}
                    </Link>
                );
            },
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (allocation) =>
                allocation.assigned ? null : (
                    <AllocationDeleteButton
                        allocation={allocation}
                        onConfirm={() => removeOne.mutate(allocation.id)}
                    />
                ),
        },
    ];

    return (
        <div className='grid items-start gap-4 lg:grid-cols-3'>
            <div className='lg:col-span-2'>
                <AdminDataTable
                    query={query}
                    columns={columns}
                    getRowKey={(allocation) => allocation.id}
                    emptyTitle='No allocations found'
                    emptyDescription='Assign ports to this node so servers can be deployed onto it.'
                    onPageChange={setPage}
                    toolbar={
                        <>
                            <label className='flex items-center gap-2 text-sm text-muted-foreground'>
                                <Checkbox
                                    checked={isUnassignedOnly}
                                    onCheckedChange={(isChecked) => handleUnassignedChange(isChecked === true)}
                                />
                                Unassigned only
                            </label>
                            <Select
                                items={ipItems}
                                value={ipFilter}
                                onValueChange={(value) => value && handleIpFilterChange(String(value))}
                            >
                                <SelectTrigger size='sm' className='w-48'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ipItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <AlertDialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                                <AlertDialogTrigger
                                    render={
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            disabled={selected.length === 0 || removeMany.isPending}
                                        />
                                    }
                                >
                                    <Trash2Icon />
                                    Delete selected ({selected.length})
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete {selected.length} allocations?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Allocations that are assigned to a server are never removed.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            variant='destructive'
                                            onClick={() => {
                                                setIsBulkOpen(false);
                                                removeMany.mutate({ ids: selected });
                                            }}
                                        >
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Dialog open={isBlockOpen} onOpenChange={setIsBlockOpen}>
                                <DialogTrigger render={<Button variant='outline' size='sm' />}>
                                    Delete all for IP
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Delete allocations for IP block</DialogTitle>
                                        <DialogDescription>
                                            Every unassigned allocation for the selected IP address will be removed from
                                            this node.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Select
                                        items={ipItems.slice(1)}
                                        value={blockIp}
                                        onValueChange={(value) => value && setBlockIp(String(value))}
                                    >
                                        <SelectTrigger className='w-full'>
                                            <SelectValue placeholder='Select an IP address' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ipItems.slice(1).map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <DialogFooter>
                                        <DialogClose render={<Button variant='outline' />}>Cancel</DialogClose>
                                        <Button
                                            variant='destructive'
                                            disabled={!blockIp || removeMany.isPending}
                                            onClick={() => blockIp && removeMany.mutate({ ip: blockIp })}
                                        >
                                            {removeMany.isPending && <Spinner />}
                                            Delete allocations
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </>
                    }
                />
            </div>
            <Card>
                <form onSubmit={handleSubmit} noValidate>
                    <CardHeader>
                        <CardTitle>Assign new allocations</CardTitle>
                        <CardDescription>Ports that servers on this node are able to bind to.</CardDescription>
                    </CardHeader>
                    <CardContent className='pt-6'>
                        <FieldGroup>
                            <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                            <Field data-invalid={!!errors.ip}>
                                <FieldLabel htmlFor='allocation-ip'>IP address</FieldLabel>
                                <Input id='allocation-ip' aria-invalid={!!errors.ip} {...form.register('ip')} />
                                <FieldDescription>Enter an IP address to assign ports to here.</FieldDescription>
                                <FieldError errors={[errors.ip]} />
                            </Field>
                            <Field data-invalid={!!errors.alias}>
                                <FieldLabel htmlFor='allocation-alias'>IP alias</FieldLabel>
                                <Input
                                    id='allocation-alias'
                                    placeholder='alias'
                                    aria-invalid={!!errors.alias}
                                    {...form.register('alias')}
                                />
                                <FieldDescription>
                                    If you would like to assign a default alias to these allocations enter it here.
                                </FieldDescription>
                                <FieldError errors={[errors.alias]} />
                            </Field>
                            <Field data-invalid={!!errors.ports}>
                                <FieldLabel htmlFor='allocation-ports'>Ports</FieldLabel>
                                <Textarea
                                    id='allocation-ports'
                                    rows={4}
                                    placeholder='25565, 25570-25580'
                                    aria-invalid={!!errors.ports}
                                    {...form.register('ports')}
                                />
                                <FieldDescription>
                                    Enter individual ports or port ranges here separated by commas or spaces. Ports must
                                    be greater than 1024 and a single range may not exceed 1000 ports.
                                </FieldDescription>
                                <FieldError errors={[errors.ports]} />
                            </Field>
                        </FieldGroup>
                    </CardContent>
                    <CardFooter className='justify-end'>
                        <Button type='submit' disabled={create.isPending}>
                            {create.isPending ? <Spinner /> : <PlusIcon />}
                            Submit
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export { NodeAllocationsTab };
