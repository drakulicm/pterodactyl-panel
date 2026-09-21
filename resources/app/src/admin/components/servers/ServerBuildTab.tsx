import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    type AdminServer,
    formatAllocation,
    getServerAllocations,
    nodeAllocationsQueryOptions,
    updateServerBuild,
} from '@/admin/api/servers';
import { AllocationCheckboxList } from '@/admin/components/servers/AllocationCheckboxList';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const numeric = (message: string, min: number, max?: number) =>
    z.string().refine((value) => {
        const parsed = Number(value);

        return value.trim() !== '' && Number.isFinite(parsed) && parsed >= min && (max === undefined || parsed <= max);
    }, message);

const optionalInteger = (message: string) =>
    z.string().refine((value) => {
        if (value.trim() === '') {
            return true;
        }

        const parsed = Number(value);

        return Number.isInteger(parsed) && parsed >= 0;
    }, message);

const schema = z.object({
    cpu: numeric('The CPU limit must be a number of 0 or more.', 0),
    threads: z
        .string()
        .refine(
            (value) => value.trim() === '' || /^[0-9-,]+$/.test(value),
            'CPU pinning may only contain numbers, dashes and commas.',
        ),
    memory: numeric('The memory limit must be a number of 0 or more.', 0),
    swap: numeric('The swap limit must be -1 or higher.', -1),
    disk: numeric('The disk limit must be a number of 0 or more.', 0),
    io: numeric('The block IO weight must be between 10 and 1000.', 10, 1000),
    oomDisabled: z.enum(['0', '1']),
    databaseLimit: optionalInteger('The database limit must be a whole number of 0 or more.'),
    allocationLimit: optionalInteger('The allocation limit must be a whole number of 0 or more.'),
    backupLimit: optionalInteger('The backup limit must be a whole number of 0 or more.'),
    allocationId: z.string().min(1, 'A default allocation must be selected.'),
    addAllocations: z.array(z.number()),
    removeAllocations: z.array(z.number()),
});

type FormValues = z.infer<typeof schema>;

const ServerBuildTab: React.FC<{ server: AdminServer }> = ({ server }) => {
    const queryClient = useQueryClient();
    const assigned = getServerAllocations(server);
    const unassigned = useQuery(nodeAllocationsQueryOptions(server.node, true));

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            cpu: String(server.limits.cpu),
            threads: server.limits.threads ?? '',
            memory: String(server.limits.memory),
            swap: String(server.limits.swap),
            disk: String(server.limits.disk),
            io: String(server.limits.io),
            oomDisabled: server.limits.oom_disabled ? '1' : '0',
            databaseLimit: server.feature_limits.databases === null ? '' : String(server.feature_limits.databases),
            allocationLimit: server.feature_limits.allocations === null ? '' : String(server.feature_limits.allocations),
            backupLimit: server.feature_limits.backups === null ? '' : String(server.feature_limits.backups),
            allocationId: String(server.allocation),
            addAllocations: [],
            removeAllocations: [],
        },
    });
    const { errors } = form.formState;
    const addAllocations = form.watch('addAllocations');
    const removeAllocations = form.watch('removeAllocations');
    const allocationId = form.watch('allocationId');

    const assignedItems = assigned.map((allocation) => ({
        value: String(allocation.id),
        label: formatAllocation(allocation),
    }));

    const update = useMutation({
        mutationFn: (values: FormValues) =>
            updateServerBuild(server.id, {
                allocation: Number(values.allocationId),
                oom_disabled: values.oomDisabled === '1',
                limits: {
                    memory: Number(values.memory),
                    swap: Number(values.swap),
                    disk: Number(values.disk),
                    io: Number(values.io),
                    cpu: Number(values.cpu),
                    threads: values.threads.trim() || null,
                },
                feature_limits: {
                    databases: values.databaseLimit.trim() === '' ? null : Number(values.databaseLimit),
                    allocations: values.allocationLimit.trim() === '' ? null : Number(values.allocationLimit),
                    backups: values.backupLimit.trim() === '' ? null : Number(values.backupLimit),
                },
                add_allocations: values.addAllocations,
                remove_allocations: values.removeAllocations,
            }),
        onSuccess: async () => {
            toast.success('Build configuration has been updated.');
            form.setValue('addAllocations', []);
            form.setValue('removeAllocations', []);
            await queryClient.invalidateQueries({ queryKey: ['admin', `/servers/${server.id}`] });
            await queryClient.invalidateQueries({ queryKey: ['admin', `/nodes/${server.node}/allocations`] });
            await queryClient.invalidateQueries({ queryKey: ['admin', '/servers'] });
        },
    });

    const handleSubmit = form.handleSubmit((values) => update.mutate(values));

    return (
        <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
            <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
            <div className='grid gap-4 lg:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Resource management</CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col gap-6'>
                        <Field data-invalid={!!errors.cpu}>
                            <FieldLabel htmlFor='build-cpu'>CPU limit</FieldLabel>
                            <InputGroup>
                                <InputGroupInput id='build-cpu' aria-invalid={!!errors.cpu} {...form.register('cpu')} />
                                <InputGroupAddon align='inline-end'>%</InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>
                                Each <em>virtual</em> core (thread) on the system is considered to be{' '}
                                <code className='font-mono'>100%</code>. Setting this value to{' '}
                                <code className='font-mono'>0</code> will allow a server to use CPU time without
                                restrictions.
                            </FieldDescription>
                            <FieldError errors={[errors.cpu]} />
                        </Field>
                        <Field data-invalid={!!errors.threads}>
                            <FieldLabel htmlFor='build-threads'>CPU pinning</FieldLabel>
                            <Input id='build-threads' aria-invalid={!!errors.threads} {...form.register('threads')} />
                            <FieldDescription>
                                <strong>Advanced:</strong> Enter the specific CPU cores that this process can run on, or
                                leave blank to allow all cores. This can be a single number, or a comma separated list.
                                Example: <code className='font-mono'>0</code>, <code className='font-mono'>0-1,3</code>,
                                or <code className='font-mono'>0,1,3,4</code>.
                            </FieldDescription>
                            <FieldError errors={[errors.threads]} />
                        </Field>
                        <Field data-invalid={!!errors.memory}>
                            <FieldLabel htmlFor='build-memory'>Allocated memory</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    id='build-memory'
                                    aria-invalid={!!errors.memory}
                                    {...form.register('memory')}
                                />
                                <InputGroupAddon align='inline-end'>MiB</InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>
                                The maximum amount of memory allowed for this container. Setting this to{' '}
                                <code className='font-mono'>0</code> will allow unlimited memory in a container.
                            </FieldDescription>
                            <FieldError errors={[errors.memory]} />
                        </Field>
                        <Field data-invalid={!!errors.swap}>
                            <FieldLabel htmlFor='build-swap'>Allocated swap</FieldLabel>
                            <InputGroup>
                                <InputGroupInput id='build-swap' aria-invalid={!!errors.swap} {...form.register('swap')} />
                                <InputGroupAddon align='inline-end'>MiB</InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>
                                Setting this to <code className='font-mono'>0</code> will disable swap space on this
                                server. Setting to <code className='font-mono'>-1</code> will allow unlimited swap.
                            </FieldDescription>
                            <FieldError errors={[errors.swap]} />
                        </Field>
                        <Field data-invalid={!!errors.disk}>
                            <FieldLabel htmlFor='build-disk'>Disk space limit</FieldLabel>
                            <InputGroup>
                                <InputGroupInput id='build-disk' aria-invalid={!!errors.disk} {...form.register('disk')} />
                                <InputGroupAddon align='inline-end'>MiB</InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>
                                This server will not be allowed to boot if it is using more than this amount of space. If
                                a server goes over this limit while running it will be safely stopped and locked until
                                enough space is available. Set to <code className='font-mono'>0</code> to allow unlimited
                                disk usage.
                            </FieldDescription>
                            <FieldError errors={[errors.disk]} />
                        </Field>
                        <Field data-invalid={!!errors.io}>
                            <FieldLabel htmlFor='build-io'>Block IO proportion</FieldLabel>
                            <Input id='build-io' aria-invalid={!!errors.io} {...form.register('io')} />
                            <FieldDescription>
                                <strong>Advanced</strong>: The IO performance of this server relative to other{' '}
                                <em>running</em> containers on the system. Value should be between{' '}
                                <code className='font-mono'>10</code> and <code className='font-mono'>1000</code>.
                            </FieldDescription>
                            <FieldError errors={[errors.io]} />
                        </Field>
                        <Field>
                            <FieldLabel id='build-oom-label'>OOM killer</FieldLabel>
                            <Controller
                                control={form.control}
                                name='oomDisabled'
                                render={({ field }) => (
                                    <RadioGroup
                                        aria-labelledby='build-oom-label'
                                        value={field.value}
                                        onValueChange={(value) => field.onChange(String(value))}
                                    >
                                        <label className='flex items-center gap-2 text-sm'>
                                            <RadioGroupItem value='0' />
                                            Enabled
                                        </label>
                                        <label className='flex items-center gap-2 text-sm'>
                                            <RadioGroupItem value='1' />
                                            Disabled
                                        </label>
                                    </RadioGroup>
                                )}
                            />
                            <FieldDescription>
                                Enabling OOM killer may cause server processes to exit unexpectedly.
                            </FieldDescription>
                        </Field>
                    </CardContent>
                </Card>

                <div className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Application feature limits</CardTitle>
                        </CardHeader>
                        <CardContent className='flex flex-col gap-6'>
                            <Field data-invalid={!!errors.databaseLimit}>
                                <FieldLabel htmlFor='build-database-limit'>Database limit</FieldLabel>
                                <Input id='build-database-limit' {...form.register('databaseLimit')} />
                                <FieldDescription>
                                    The total number of databases a user is allowed to create for this server.
                                </FieldDescription>
                                <FieldError errors={[errors.databaseLimit]} />
                            </Field>
                            <Field data-invalid={!!errors.allocationLimit}>
                                <FieldLabel htmlFor='build-allocation-limit'>Allocation limit</FieldLabel>
                                <Input id='build-allocation-limit' {...form.register('allocationLimit')} />
                                <FieldDescription>
                                    The total number of allocations a user is allowed to create for this server.
                                </FieldDescription>
                                <FieldError errors={[errors.allocationLimit]} />
                            </Field>
                            <Field data-invalid={!!errors.backupLimit}>
                                <FieldLabel htmlFor='build-backup-limit'>Backup limit</FieldLabel>
                                <Input id='build-backup-limit' {...form.register('backupLimit')} />
                                <FieldDescription>
                                    The total number of backups that can be created for this server.
                                </FieldDescription>
                                <FieldError errors={[errors.backupLimit]} />
                            </Field>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Allocation management</CardTitle>
                        </CardHeader>
                        <CardContent className='flex flex-col gap-6'>
                            <Field data-invalid={!!errors.allocationId}>
                                <FieldLabel htmlFor='build-allocation'>Game port</FieldLabel>
                                <Select
                                    items={assignedItems}
                                    value={allocationId}
                                    onValueChange={(value) => value && form.setValue('allocationId', String(value))}
                                >
                                    <SelectTrigger id='build-allocation' className='w-full'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignedItems.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>
                                    The default connection address that will be used for this game server.
                                </FieldDescription>
                                <FieldError errors={[errors.allocationId]} />
                            </Field>
                            <Field>
                                <FieldLabel>Assign additional ports</FieldLabel>
                                {unassigned.isPending ? (
                                    <Skeleton className='h-24 rounded-lg' />
                                ) : (
                                    <AllocationCheckboxList
                                        allocations={unassigned.data ?? []}
                                        selected={addAllocations}
                                        emptyMessage='This node has no unassigned allocations.'
                                        onChange={(selected) => form.setValue('addAllocations', selected)}
                                    />
                                )}
                                <FieldDescription>
                                    Please note that due to software limitations you cannot assign identical ports on
                                    different IPs to the same server.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <FieldLabel>Remove additional ports</FieldLabel>
                                <AllocationCheckboxList
                                    allocations={assigned}
                                    selected={removeAllocations}
                                    emptyMessage='This server has no allocations assigned to it.'
                                    onChange={(selected) => form.setValue('removeAllocations', selected)}
                                />
                                <FieldDescription>
                                    Simply select which ports you would like to remove from the list above. If you want to
                                    assign a port on a different IP that is already in use you can select it from the left
                                    and delete it here.
                                </FieldDescription>
                            </Field>
                        </CardContent>
                        <CardFooter className='justify-end'>
                            <Button type='submit' disabled={update.isPending}>
                                {update.isPending && <Spinner />}
                                Update build configuration
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </form>
    );
};

export { ServerBuildTab };
