import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    type AdminServerUser,
    createServer,
    formatAllocation,
    getEggVariables,
    getLocationNodes,
    getNestEggs,
    nodeAllocationsQueryOptions,
    serverEggQueryOptions,
    serverLocationsQueryOptions,
    serverNestsQueryOptions,
} from '@/admin/api/servers';
import { AllocationCheckboxList } from '@/admin/components/servers/AllocationCheckboxList';
import { EggVariableFields } from '@/admin/components/servers/EggVariableFields';
import { OwnerPicker } from '@/admin/components/servers/OwnerPicker';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
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
    name: z.string().min(1, 'A server name is required.').max(191, 'The server name may not exceed 191 characters.'),
    ownerId: z.number({ message: 'A server owner must be selected.' }).int().positive('A server owner must be selected.'),
    description: z.string(),
    startOnCompletion: z.boolean(),
    nodeId: z.string().min(1, 'A node must be selected.'),
    allocationId: z.string().min(1, 'A default allocation must be selected.'),
    additionalAllocations: z.array(z.number()),
    databaseLimit: optionalInteger('The database limit must be a whole number of 0 or more.'),
    allocationLimit: optionalInteger('The allocation limit must be a whole number of 0 or more.'),
    backupLimit: optionalInteger('The backup limit must be a whole number of 0 or more.'),
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
    isOomKillerEnabled: z.boolean(),
    nestId: z.string().min(1, 'A nest must be selected.'),
    eggId: z.string().min(1, 'An egg must be selected.'),
    dockerImage: z.string(),
    customImage: z.string(),
    skipScripts: z.boolean(),
    startup: z.string().min(1, 'A startup command is required.'),
    environment: z.record(z.string(), z.string()),
});

type FormValues = z.infer<typeof schema>;

const ServerNewPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const ownerRef = useRef<AdminServerUser | null>(null);
    const appliedEggRef = useRef<string | null>(null);

    const locations = useQuery(serverLocationsQueryOptions);
    const nests = useQuery(serverNestsQueryOptions);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            ownerId: 0,
            description: '',
            startOnCompletion: false,
            nodeId: '',
            allocationId: '',
            additionalAllocations: [],
            databaseLimit: '0',
            allocationLimit: '0',
            backupLimit: '0',
            cpu: '0',
            threads: '',
            memory: '',
            swap: '0',
            disk: '',
            io: '500',
            isOomKillerEnabled: false,
            nestId: '',
            eggId: '',
            dockerImage: '',
            customImage: '',
            skipScripts: false,
            startup: '',
            environment: {},
        },
    });
    const { errors } = form.formState;

    const nodeId = form.watch('nodeId');
    const nestId = form.watch('nestId');
    const eggId = form.watch('eggId');
    const environment = form.watch('environment');
    const additionalAllocations = form.watch('additionalAllocations');
    const allocationId = form.watch('allocationId');
    const ownerId = form.watch('ownerId');

    const allocations = useQuery(nodeAllocationsQueryOptions(nodeId ? Number(nodeId) : null, true));
    const egg = useQuery(serverEggQueryOptions(nestId ? Number(nestId) : null, eggId ? Number(eggId) : null));

    const locationItems = locations.data?.items ?? [];
    const nestItems = nests.data?.items ?? [];
    const nodeItems = locationItems.flatMap((location) =>
        getLocationNodes(location).map((node) => ({ value: String(node.id), label: node.name })),
    );
    const eggItems = nestItems
        .filter((nest) => String(nest.id) === nestId)
        .flatMap((nest) => getNestEggs(nest).map((item) => ({ value: String(item.id), label: item.name })));
    const nestSelectItems = nestItems.map((nest) => ({ value: String(nest.id), label: nest.name }));
    const allocationItems = (allocations.data ?? []).map((allocation) => ({
        value: String(allocation.id),
        label: formatAllocation(allocation),
    }));
    const imageItems = Object.entries(egg.data?.docker_images ?? {}).map(([label, image]) => ({
        value: image,
        label: `${label} (${image})`,
    }));

    useEffect(() => {
        if (!nodeId && nodeItems[0]) {
            form.setValue('nodeId', nodeItems[0].value);
        }
    }, [form, nodeId, nodeItems]);

    useEffect(() => {
        if (!nestId && nestSelectItems[0]) {
            form.setValue('nestId', nestSelectItems[0].value);
        }
    }, [form, nestId, nestSelectItems]);

    useEffect(() => {
        if (eggItems.length > 0 && !eggItems.some((item) => item.value === eggId)) {
            form.setValue('eggId', eggItems[0]?.value ?? '');
        }
    }, [eggId, eggItems, form]);

    useEffect(() => {
        if (!egg.data || appliedEggRef.current === String(egg.data.id)) {
            return;
        }

        appliedEggRef.current = String(egg.data.id);
        form.setValue('startup', egg.data.startup);
        form.setValue('dockerImage', egg.data.docker_image);
        form.setValue('customImage', '');
        form.setValue(
            'environment',
            Object.fromEntries(
                getEggVariables(egg.data).map((variable) => [variable.env_variable, variable.default_value ?? '']),
            ),
        );
    }, [egg.data, form]);

    const create = useMutation({
        mutationFn: createServer,
        onSuccess: async (server) => {
            toast.success(`${server.name} has been created and is now installing.`);
            await queryClient.invalidateQueries({ queryKey: ['admin', '/servers'] });
            await navigate({
                to: '/admin/servers/view/$serverId',
                params: { serverId: String(server.id) },
                search: { tab: 'about' as const },
            });
        },
    });

    const handleSubmit = form.handleSubmit((values) =>
        create.mutate({
            name: values.name,
            user: values.ownerId,
            description: values.description || null,
            egg: Number(values.eggId),
            docker_image: values.customImage.trim() || values.dockerImage,
            startup: values.startup,
            environment: values.environment,
            skip_scripts: values.skipScripts,
            oom_disabled: !values.isOomKillerEnabled,
            start_on_completion: values.startOnCompletion,
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
            allocation: {
                default: Number(values.allocationId),
                additional: values.additionalAllocations,
            },
        }),
    );

    const handleNodeChange = (value: string) => {
        form.setValue('nodeId', value);
        form.setValue('allocationId', '');
        form.setValue('additionalAllocations', []);
    };

    return (
        <>
            <PageHeader title='Create server'>
                <Button variant='outline' size='sm' nativeButton={false} render={<Link to='/admin/servers' />}>
                    Back to servers
                </Button>
            </PageHeader>
            <form onSubmit={handleSubmit} noValidate className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                <Card>
                    <CardHeader>
                        <CardTitle>Core details</CardTitle>
                    </CardHeader>
                    <CardContent className='grid gap-6 md:grid-cols-2'>
                        <div className='flex flex-col gap-6'>
                            <Field data-invalid={!!errors.name}>
                                <FieldLabel htmlFor='server-name'>Server name</FieldLabel>
                                <Input id='server-name' aria-invalid={!!errors.name} {...form.register('name')} />
                                <FieldDescription>
                                    Character limits: <code className='font-mono'>a-z A-Z 0-9 _ - .</code> and{' '}
                                    <code className='font-mono'>[Space]</code>.
                                </FieldDescription>
                                <FieldError errors={[errors.name]} />
                            </Field>
                            <Field data-invalid={!!errors.ownerId}>
                                <FieldLabel>Server owner</FieldLabel>
                                <OwnerPicker
                                    value={ownerId || null}
                                    selectedLabel={ownerRef.current ? ownerRef.current.email : null}
                                    onChange={(user) => {
                                        ownerRef.current = user;
                                        form.setValue('ownerId', user.id, { shouldValidate: true });
                                    }}
                                />
                                <FieldDescription>Email address of the server owner.</FieldDescription>
                                <FieldError errors={[errors.ownerId]} />
                            </Field>
                        </div>
                        <div className='flex flex-col gap-6'>
                            <Field>
                                <FieldLabel htmlFor='server-description'>Server description</FieldLabel>
                                <Textarea id='server-description' rows={3} {...form.register('description')} />
                                <FieldDescription>A brief description of this server.</FieldDescription>
                            </Field>
                            <Controller
                                control={form.control}
                                name='startOnCompletion'
                                render={({ field }) => (
                                    <label className='flex items-center gap-2 text-sm font-medium'>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) => field.onChange(checked === true)}
                                        />
                                        Start server when installed
                                    </label>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Allocation management</CardTitle>
                    </CardHeader>
                    <CardContent className='grid gap-6 md:grid-cols-3'>
                        <Field data-invalid={!!errors.nodeId}>
                            <FieldLabel htmlFor='server-node'>Node</FieldLabel>
                            {locations.isPending ? (
                                <Skeleton className='h-8 rounded-lg' />
                            ) : (
                                <Select items={nodeItems} value={nodeId} onValueChange={(value) => value && handleNodeChange(String(value))}>
                                    <SelectTrigger id='server-node' className='w-full'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locationItems.map((location) => (
                                            <SelectGroup key={location.id}>
                                                <SelectLabel>
                                                    {location.long} ({location.short})
                                                </SelectLabel>
                                                {getLocationNodes(location).map((node) => (
                                                    <SelectItem key={node.id} value={String(node.id)}>
                                                        {node.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <FieldDescription>The node which this server will be deployed to.</FieldDescription>
                            <FieldError errors={[errors.nodeId]} />
                        </Field>
                        <Field data-invalid={!!errors.allocationId}>
                            <FieldLabel htmlFor='server-allocation'>Default allocation</FieldLabel>
                            {allocations.isPending && nodeId ? (
                                <Skeleton className='h-8 rounded-lg' />
                            ) : allocationItems.length === 0 ? (
                                <p className='rounded-lg border p-3 text-sm text-muted-foreground'>
                                    This node has no unassigned allocations.
                                </p>
                            ) : (
                                <Select
                                    items={allocationItems}
                                    value={allocationId || null}
                                    onValueChange={(value) => value && form.setValue('allocationId', String(value))}
                                >
                                    <SelectTrigger id='server-allocation' className='w-full'>
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
                            )}
                            <FieldDescription>
                                The main allocation that will be assigned to this server.
                            </FieldDescription>
                            <FieldError errors={[errors.allocationId]} />
                        </Field>
                        <Field>
                            <FieldLabel>Additional allocation(s)</FieldLabel>
                            <AllocationCheckboxList
                                allocations={(allocations.data ?? []).filter(
                                    (allocation) => String(allocation.id) !== allocationId,
                                )}
                                selected={additionalAllocations}
                                emptyMessage='No other unassigned allocations are available on this node.'
                                onChange={(selected) => form.setValue('additionalAllocations', selected)}
                            />
                            <FieldDescription>
                                Additional allocations to assign to this server on creation.
                            </FieldDescription>
                        </Field>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Application feature limits</CardTitle>
                    </CardHeader>
                    <CardContent className='grid gap-6 md:grid-cols-3'>
                        <Field data-invalid={!!errors.databaseLimit}>
                            <FieldLabel htmlFor='server-database-limit'>Database limit</FieldLabel>
                            <Input id='server-database-limit' {...form.register('databaseLimit')} />
                            <FieldDescription>
                                The total number of databases a user is allowed to create for this server.
                            </FieldDescription>
                            <FieldError errors={[errors.databaseLimit]} />
                        </Field>
                        <Field data-invalid={!!errors.allocationLimit}>
                            <FieldLabel htmlFor='server-allocation-limit'>Allocation limit</FieldLabel>
                            <Input id='server-allocation-limit' {...form.register('allocationLimit')} />
                            <FieldDescription>
                                The total number of allocations a user is allowed to create for this server.
                            </FieldDescription>
                            <FieldError errors={[errors.allocationLimit]} />
                        </Field>
                        <Field data-invalid={!!errors.backupLimit}>
                            <FieldLabel htmlFor='server-backup-limit'>Backup limit</FieldLabel>
                            <Input id='server-backup-limit' {...form.register('backupLimit')} />
                            <FieldDescription>
                                The total number of backups that can be created for this server.
                            </FieldDescription>
                            <FieldError errors={[errors.backupLimit]} />
                        </Field>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resource management</CardTitle>
                    </CardHeader>
                    <CardContent className='grid gap-6 md:grid-cols-2'>
                        <Field data-invalid={!!errors.cpu}>
                            <FieldLabel htmlFor='server-cpu'>CPU limit</FieldLabel>
                            <InputGroup>
                                <InputGroupInput id='server-cpu' aria-invalid={!!errors.cpu} {...form.register('cpu')} />
                                <InputGroupAddon align='inline-end'>%</InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>
                                If you do not want to limit CPU usage, set the value to <code className='font-mono'>0</code>.
                                To determine a value, take the number of threads and multiply it by 100. For example, on a
                                quad core system without hyperthreading <code className='font-mono'>(4 * 100 = 400)</code>{' '}
                                there is <code className='font-mono'>400%</code> available. To limit a server to using half
                                of a single thread, you would set the value to <code className='font-mono'>50</code>. To
                                allow a server to use up to two threads, set the value to{' '}
                                <code className='font-mono'>200</code>.
                            </FieldDescription>
                            <FieldError errors={[errors.cpu]} />
                        </Field>
                        <Field data-invalid={!!errors.threads}>
                            <FieldLabel htmlFor='server-threads'>CPU pinning</FieldLabel>
                            <Input id='server-threads' aria-invalid={!!errors.threads} {...form.register('threads')} />
                            <FieldDescription>
                                <strong>Advanced:</strong> Enter the specific CPU threads that this process can run on, or
                                leave blank to allow all threads. This can be a single number, or a comma separated list.
                                Example: <code className='font-mono'>0</code>, <code className='font-mono'>0-1,3</code>, or{' '}
                                <code className='font-mono'>0,1,3,4</code>.
                            </FieldDescription>
                            <FieldError errors={[errors.threads]} />
                        </Field>
                        <Field data-invalid={!!errors.memory}>
                            <FieldLabel htmlFor='server-memory'>Memory</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    id='server-memory'
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
                            <FieldLabel htmlFor='server-swap'>Swap</FieldLabel>
                            <InputGroup>
                                <InputGroupInput id='server-swap' aria-invalid={!!errors.swap} {...form.register('swap')} />
                                <InputGroupAddon align='inline-end'>MiB</InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>
                                Setting this to <code className='font-mono'>0</code> will disable swap space on this
                                server. Setting to <code className='font-mono'>-1</code> will allow unlimited swap.
                            </FieldDescription>
                            <FieldError errors={[errors.swap]} />
                        </Field>
                        <Field data-invalid={!!errors.disk}>
                            <FieldLabel htmlFor='server-disk'>Disk space</FieldLabel>
                            <InputGroup>
                                <InputGroupInput id='server-disk' aria-invalid={!!errors.disk} {...form.register('disk')} />
                                <InputGroupAddon align='inline-end'>MiB</InputGroupAddon>
                            </InputGroup>
                            <FieldDescription>
                                This server will not be allowed to boot if it is using more than this amount of space. If a
                                server goes over this limit while running it will be safely stopped and locked until enough
                                space is available. Set to <code className='font-mono'>0</code> to allow unlimited disk
                                usage.
                            </FieldDescription>
                            <FieldError errors={[errors.disk]} />
                        </Field>
                        <Field data-invalid={!!errors.io}>
                            <FieldLabel htmlFor='server-io'>Block IO weight</FieldLabel>
                            <Input id='server-io' aria-invalid={!!errors.io} {...form.register('io')} />
                            <FieldDescription>
                                <strong>Advanced</strong>: The IO performance of this server relative to other{' '}
                                <em>running</em> containers on the system. Value should be between{' '}
                                <code className='font-mono'>10</code> and <code className='font-mono'>1000</code>.
                            </FieldDescription>
                            <FieldError errors={[errors.io]} />
                        </Field>
                        <Field className='md:col-span-2'>
                            <Controller
                                control={form.control}
                                name='isOomKillerEnabled'
                                render={({ field }) => (
                                    <label className='flex items-center gap-2 text-sm font-medium'>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) => field.onChange(checked === true)}
                                        />
                                        Enable OOM killer
                                    </label>
                                )}
                            />
                            <FieldDescription>
                                Terminates the server if it breaches the memory limits. Enabling OOM killer may cause
                                server processes to exit unexpectedly.
                            </FieldDescription>
                        </Field>
                    </CardContent>
                </Card>

                <div className='grid gap-4 md:grid-cols-2'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Nest configuration</CardTitle>
                        </CardHeader>
                        <CardContent className='flex flex-col gap-6'>
                            <Field data-invalid={!!errors.nestId}>
                                <FieldLabel htmlFor='server-nest'>Nest</FieldLabel>
                                {nests.isPending ? (
                                    <Skeleton className='h-8 rounded-lg' />
                                ) : (
                                    <Select
                                        items={nestSelectItems}
                                        value={nestId}
                                        onValueChange={(value) => value && form.setValue('nestId', String(value))}
                                    >
                                        <SelectTrigger id='server-nest' className='w-full'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {nestSelectItems.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <FieldDescription>
                                    Select the nest that this server will be grouped under.
                                </FieldDescription>
                                <FieldError errors={[errors.nestId]} />
                            </Field>
                            <Field data-invalid={!!errors.eggId}>
                                <FieldLabel htmlFor='server-egg'>Egg</FieldLabel>
                                <Select
                                    items={eggItems}
                                    value={eggId || null}
                                    onValueChange={(value) => value && form.setValue('eggId', String(value))}
                                >
                                    <SelectTrigger id='server-egg' className='w-full'>
                                        <SelectValue placeholder='Select an egg' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eggItems.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>
                                    Select the egg that will define how this server should operate.
                                </FieldDescription>
                                <FieldError errors={[errors.eggId]} />
                            </Field>
                            <Field>
                                <Controller
                                    control={form.control}
                                    name='skipScripts'
                                    render={({ field }) => (
                                        <label className='flex items-center gap-2 text-sm font-medium'>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={(checked) => field.onChange(checked === true)}
                                            />
                                            Skip egg install script
                                        </label>
                                    )}
                                />
                                <FieldDescription>
                                    If the selected egg has an install script attached to it, the script will run during
                                    the install. If you would like to skip this step, check this box.
                                </FieldDescription>
                            </Field>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Docker configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Field>
                                <FieldLabel htmlFor='server-image'>Docker image</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name='dockerImage'
                                    render={({ field }) => (
                                        <Select
                                            items={imageItems}
                                            value={field.value || null}
                                            onValueChange={(value) => {
                                                if (!value) {
                                                    return;
                                                }

                                                field.onChange(String(value));
                                                form.setValue('customImage', '');
                                            }}
                                        >
                                            <SelectTrigger id='server-image' className='w-full'>
                                                <SelectValue placeholder='Select an image' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {imageItems.map((item) => (
                                                    <SelectItem key={item.value} value={item.value}>
                                                        {item.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <Input placeholder='Or enter a custom image...' {...form.register('customImage')} />
                                <FieldDescription>
                                    This is the default Docker image that will be used to run this server. Select an image
                                    from the dropdown above, or enter a custom image in the text field above.
                                </FieldDescription>
                            </Field>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Startup configuration</CardTitle>
                        <CardDescription>
                            The following data substitutes are available for the startup command:{' '}
                            <code className='font-mono'>{'{{SERVER_MEMORY}}'}</code>,{' '}
                            <code className='font-mono'>{'{{SERVER_IP}}'}</code>, and{' '}
                            <code className='font-mono'>{'{{SERVER_PORT}}'}</code>. They will be replaced with the
                            allocated memory, server IP, and server port respectively.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='flex flex-col gap-6'>
                        <Field data-invalid={!!errors.startup}>
                            <FieldLabel htmlFor='server-startup'>Startup command</FieldLabel>
                            <Input id='server-startup' aria-invalid={!!errors.startup} {...form.register('startup')} />
                            <FieldError errors={[errors.startup]} />
                        </Field>
                        <div className='flex flex-col gap-2'>
                            <h3 className='text-sm font-medium'>Service variables</h3>
                            {egg.isPending && eggId ? (
                                <Skeleton className='h-32 rounded-xl' />
                            ) : (
                                <EggVariableFields
                                    variables={getEggVariables(egg.data)}
                                    values={environment}
                                    onChange={(envVariable, value) =>
                                        form.setValue('environment', { ...environment, [envVariable]: value })
                                    }
                                />
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className='justify-end'>
                        <Button type='submit' disabled={create.isPending}>
                            {create.isPending && <Spinner />}
                            Create server
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </>
    );
};

export { ServerNewPage };
