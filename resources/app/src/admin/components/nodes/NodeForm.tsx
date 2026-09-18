import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    type AdminNode,
    type AdminNodeBody,
    createNode,
    nodeLocationsQueryOptions,
    updateNode,
} from '@/admin/api/nodes';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const numeric = (message: string, min: number, max?: number) =>
    z
        .string()
        .regex(/^-?\d+$/, message)
        .refine((value) => Number(value) >= min && (max === undefined || Number(value) <= max), { message });

const schema = z.object({
    name: z
        .string()
        .regex(/^[\w .-]{1,100}$/, 'Character limits: a-zA-Z0-9_.- and [Space] (min 1, max 100 characters).'),
    description: z.string(),
    locationId: z.string().min(1, 'A location must be selected for this node.'),
    isPublic: z.enum(['1', '0']),
    fqdn: z.string().min(1, 'A fully qualified domain name is required.'),
    scheme: z.enum(['https', 'http']),
    behindProxy: z.enum(['1', '0']),
    maintenanceMode: z.enum(['1', '0']),
    memory: numeric('The total memory must be at least 1 MiB.', 1),
    memoryOverallocate: numeric('The memory over-allocation must be -1 or higher.', -1),
    disk: numeric('The total disk space must be at least 1 MiB.', 1),
    diskOverallocate: numeric('The disk over-allocation must be -1 or higher.', -1),
    uploadSize: numeric('The file upload size limit must be at least 1 MiB.', 1),
    daemonListen: numeric('The daemon port must be between 1 and 65535.', 1, 65535),
    daemonSftp: numeric('The daemon SFTP port must be between 1 and 65535.', 1, 65535),
    daemonBase: z
        .string()
        .regex(/^\/[\d\w.\-/]+$/, 'The daemon server file directory must be an absolute path, e.g. /var/lib/pterodactyl/volumes.'),
    resetSecret: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const toFormValues = (node: AdminNode): FormValues => ({
    name: node.name,
    description: node.description ?? '',
    locationId: String(node.location_id),
    isPublic: node.public ? '1' : '0',
    fqdn: node.fqdn,
    scheme: node.scheme === 'https' ? 'https' : 'http',
    behindProxy: node.behind_proxy ? '1' : '0',
    maintenanceMode: node.maintenance_mode ? '1' : '0',
    memory: String(node.memory),
    memoryOverallocate: String(node.memory_overallocate),
    disk: String(node.disk),
    diskOverallocate: String(node.disk_overallocate),
    uploadSize: String(node.upload_size),
    daemonListen: String(node.daemon_listen),
    daemonSftp: String(node.daemon_sftp),
    daemonBase: node.daemon_base,
    resetSecret: false,
});

const NodeForm: React.FC<{
    node?: AdminNode;
}> = ({ node }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const locations = useQuery(nodeLocationsQueryOptions);
    const isPanelSecure = window.location.protocol === 'https:';

    const locationItems = (locations.data?.items ?? []).map((location) => ({
        value: String(location.id),
        label: location.long ? `${location.long} (${location.short})` : location.short,
    }));

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            description: '',
            locationId: '',
            isPublic: '1',
            fqdn: '',
            scheme: 'https',
            behindProxy: '0',
            maintenanceMode: '0',
            memory: '',
            memoryOverallocate: '0',
            disk: '',
            diskOverallocate: '0',
            uploadSize: '100',
            daemonListen: '8080',
            daemonSftp: '2022',
            daemonBase: '/var/lib/pterodactyl/volumes',
            resetSecret: false,
        },
        values: node ? toFormValues(node) : undefined,
    });
    const { errors } = form.formState;

    const create = useMutation({
        mutationFn: createNode,
        onSuccess: async (created) => {
            toast.success('A new node has been created on the panel.');
            await queryClient.invalidateQueries({ queryKey: ['admin', '/nodes'] });

            return navigate({
                to: '/admin/nodes/view/$nodeId',
                params: { nodeId: String(created.id) },
                search: { tab: 'allocation' },
            });
        },
    });

    const update = useMutation({
        mutationFn: (body: AdminNodeBody) => updateNode(node?.id ?? 0, body),
        onSuccess: async (result) => {
            if (result.isConfigurationPersisted) {
                toast.success('Node settings have been updated.');
            } else {
                toast.warning(result.warning ?? 'The node configuration could not be pushed to the daemon.');
            }

            form.setValue('resetSecret', false);
            await queryClient.invalidateQueries({ queryKey: ['admin', '/nodes'] });

            return queryClient.invalidateQueries({ queryKey: ['admin', `/nodes/${node?.id}`] });
        },
    });

    const mutation = node ? update : create;

    const handleSubmit = form.handleSubmit((values) => {
        const body: AdminNodeBody = {
            name: values.name,
            description: values.description.length > 0 ? values.description : null,
            location_id: Number(values.locationId),
            public: values.isPublic === '1',
            fqdn: values.fqdn,
            scheme: values.scheme,
            behind_proxy: values.behindProxy === '1',
            memory: Number(values.memory),
            memory_overallocate: Number(values.memoryOverallocate),
            disk: Number(values.disk),
            disk_overallocate: Number(values.diskOverallocate),
            upload_size: Number(values.uploadSize),
            daemon_listen: Number(values.daemonListen),
            daemon_sftp: Number(values.daemonSftp),
            daemon_base: values.daemonBase,
        };

        if (!node) {
            create.mutate(body);

            return;
        }

        update.mutate({ ...body, maintenance_mode: values.maintenanceMode === '1', reset_secret: values.resetSecret });
    });

    return (
        <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
            <FormError message={mutation.error ? httpErrorToHuman(mutation.error) : null} />
            <div className='grid items-start gap-4 lg:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Basic details</CardTitle>
                        <CardDescription>How this node is identified and reached by the panel.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FieldGroup>
                            <Field data-invalid={!!errors.name}>
                                <FieldLabel htmlFor='node-name'>Name</FieldLabel>
                                <Input id='node-name' aria-invalid={!!errors.name} {...form.register('name')} />
                                <FieldDescription>
                                    Character limits: <code className='font-mono text-xs'>a-zA-Z0-9_.-</code> and{' '}
                                    <code className='font-mono text-xs'>[Space]</code> (min 1, max 100 characters).
                                </FieldDescription>
                                <FieldError errors={[errors.name]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='node-description'>Description</FieldLabel>
                                <Textarea id='node-description' rows={4} {...form.register('description')} />
                            </Field>
                            <Field data-invalid={!!errors.locationId}>
                                <FieldLabel htmlFor='node-location'>Location</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name='locationId'
                                    render={({ field }) => (
                                        <Select
                                            items={locationItems}
                                            value={field.value}
                                            onValueChange={(value) => value && field.onChange(String(value))}
                                        >
                                            <SelectTrigger id='node-location' className='w-full'>
                                                <SelectValue placeholder='Select a location' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {locationItems.map((location) => (
                                                    <SelectItem key={location.value} value={location.value}>
                                                        {location.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <FieldError errors={[errors.locationId]} />
                            </Field>
                            <Field>
                                <FieldLabel id='node-visibility-label'>Node visibility</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name='isPublic'
                                    render={({ field }) => (
                                        <RadioGroup
                                            aria-labelledby='node-visibility-label'
                                            value={field.value}
                                            onValueChange={(value) => field.onChange(String(value))}
                                        >
                                            <label className='flex items-center gap-2 text-sm'>
                                                <RadioGroupItem value='1' />
                                                Public
                                            </label>
                                            <label className='flex items-center gap-2 text-sm'>
                                                <RadioGroupItem value='0' />
                                                Private
                                            </label>
                                        </RadioGroup>
                                    )}
                                />
                                <FieldDescription>
                                    By setting a node to <code className='font-mono text-xs'>private</code> you will be
                                    denying the ability to auto-deploy to this node.
                                </FieldDescription>
                            </Field>
                            <Field data-invalid={!!errors.fqdn}>
                                <FieldLabel htmlFor='node-fqdn'>FQDN</FieldLabel>
                                <Input id='node-fqdn' aria-invalid={!!errors.fqdn} {...form.register('fqdn')} />
                                <FieldDescription>
                                    Please enter domain name (e.g <code className='font-mono text-xs'>node.example.com</code>
                                    ) to be used for connecting to the daemon. An IP address may be used <em>only</em> if
                                    you are not using SSL for this node.
                                </FieldDescription>
                                <FieldError errors={[errors.fqdn]} />
                            </Field>
                            <Field>
                                <FieldLabel id='node-scheme-label'>Communicate over SSL</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name='scheme'
                                    render={({ field }) => (
                                        <RadioGroup
                                            aria-labelledby='node-scheme-label'
                                            value={field.value}
                                            onValueChange={(value) => field.onChange(String(value))}
                                        >
                                            <label className='flex items-center gap-2 text-sm'>
                                                <RadioGroupItem value='https' />
                                                Use SSL connection
                                            </label>
                                            <label className='flex items-center gap-2 text-sm'>
                                                <RadioGroupItem value='http' disabled={isPanelSecure} />
                                                Use HTTP connection
                                            </label>
                                        </RadioGroup>
                                    )}
                                />
                                {isPanelSecure ? (
                                    <FieldDescription className='text-destructive'>
                                        Your panel is currently configured to use a secure connection. In order for
                                        browsers to connect to your node it <strong>must</strong> use a SSL connection.
                                    </FieldDescription>
                                ) : (
                                    <FieldDescription>
                                        In most cases you should select to use a SSL connection. If using an IP address
                                        or you do not wish to use SSL at all, select a HTTP connection.
                                    </FieldDescription>
                                )}
                            </Field>
                            <Field>
                                <FieldLabel id='node-proxy-label'>Behind proxy</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name='behindProxy'
                                    render={({ field }) => (
                                        <RadioGroup
                                            aria-labelledby='node-proxy-label'
                                            value={field.value}
                                            onValueChange={(value) => field.onChange(String(value))}
                                        >
                                            <label className='flex items-center gap-2 text-sm'>
                                                <RadioGroupItem value='0' />
                                                Not behind proxy
                                            </label>
                                            <label className='flex items-center gap-2 text-sm'>
                                                <RadioGroupItem value='1' />
                                                Behind proxy
                                            </label>
                                        </RadioGroup>
                                    )}
                                />
                                <FieldDescription>
                                    If you are running the daemon behind a proxy such as Cloudflare, select this to have
                                    the daemon skip looking for certificates on boot.
                                </FieldDescription>
                            </Field>
                            {node && (
                                <Field>
                                    <FieldLabel id='node-maintenance-label'>Maintenance mode</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name='maintenanceMode'
                                        render={({ field }) => (
                                            <RadioGroup
                                                aria-labelledby='node-maintenance-label'
                                                value={field.value}
                                                onValueChange={(value) => field.onChange(String(value))}
                                            >
                                                <label className='flex items-center gap-2 text-sm'>
                                                    <RadioGroupItem value='0' />
                                                    Disabled
                                                </label>
                                                <label className='flex items-center gap-2 text-sm'>
                                                    <RadioGroupItem value='1' />
                                                    Enabled
                                                </label>
                                            </RadioGroup>
                                        )}
                                    />
                                    <FieldDescription>
                                        If the node is marked as &apos;Under Maintenance&apos; users won&apos;t be able
                                        to access servers that are on this node.
                                    </FieldDescription>
                                </Field>
                            )}
                        </FieldGroup>
                    </CardContent>
                </Card>
                <div className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Allocation limits</CardTitle>
                            <CardDescription>
                                Resources made available to servers that are deployed to this node.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <div className='grid gap-4 sm:grid-cols-2'>
                                    <Field data-invalid={!!errors.memory}>
                                        <FieldLabel htmlFor='node-memory'>Total memory</FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                id='node-memory'
                                                aria-invalid={!!errors.memory}
                                                {...form.register('memory')}
                                            />
                                            <InputGroupAddon align='inline-end'>MiB</InputGroupAddon>
                                        </InputGroup>
                                        <FieldError errors={[errors.memory]} />
                                    </Field>
                                    <Field data-invalid={!!errors.memoryOverallocate}>
                                        <FieldLabel htmlFor='node-memory-overallocate'>Memory over-allocation</FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                id='node-memory-overallocate'
                                                aria-invalid={!!errors.memoryOverallocate}
                                                {...form.register('memoryOverallocate')}
                                            />
                                            <InputGroupAddon align='inline-end'>%</InputGroupAddon>
                                        </InputGroup>
                                        <FieldError errors={[errors.memoryOverallocate]} />
                                    </Field>
                                </div>
                                <FieldDescription>
                                    Enter the total amount of memory available for new servers. If you would like to
                                    allow overallocation of memory enter the percentage that you want to allow. To
                                    disable checking for overallocation enter <code className='font-mono text-xs'>-1</code>{' '}
                                    into the field. Entering <code className='font-mono text-xs'>0</code> will prevent
                                    creating new servers if it would put the node over the limit.
                                </FieldDescription>
                                <div className='grid gap-4 sm:grid-cols-2'>
                                    <Field data-invalid={!!errors.disk}>
                                        <FieldLabel htmlFor='node-disk'>Total disk space</FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                id='node-disk'
                                                aria-invalid={!!errors.disk}
                                                {...form.register('disk')}
                                            />
                                            <InputGroupAddon align='inline-end'>MiB</InputGroupAddon>
                                        </InputGroup>
                                        <FieldError errors={[errors.disk]} />
                                    </Field>
                                    <Field data-invalid={!!errors.diskOverallocate}>
                                        <FieldLabel htmlFor='node-disk-overallocate'>Disk over-allocation</FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                id='node-disk-overallocate'
                                                aria-invalid={!!errors.diskOverallocate}
                                                {...form.register('diskOverallocate')}
                                            />
                                            <InputGroupAddon align='inline-end'>%</InputGroupAddon>
                                        </InputGroup>
                                        <FieldError errors={[errors.diskOverallocate]} />
                                    </Field>
                                </div>
                                <FieldDescription>
                                    Enter the total amount of disk space available for new servers. If you would like to
                                    allow overallocation of disk space enter the percentage that you want to allow. To
                                    disable checking for overallocation enter <code className='font-mono text-xs'>-1</code>{' '}
                                    into the field.
                                </FieldDescription>
                            </FieldGroup>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>General configuration</CardTitle>
                            <CardDescription>Ports and paths used by the daemon running on this node.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <div className='grid gap-4 sm:grid-cols-2'>
                                    <Field data-invalid={!!errors.daemonListen}>
                                        <FieldLabel htmlFor='node-daemon-listen'>Daemon port</FieldLabel>
                                        <Input
                                            id='node-daemon-listen'
                                            aria-invalid={!!errors.daemonListen}
                                            {...form.register('daemonListen')}
                                        />
                                        <FieldError errors={[errors.daemonListen]} />
                                    </Field>
                                    <Field data-invalid={!!errors.daemonSftp}>
                                        <FieldLabel htmlFor='node-daemon-sftp'>Daemon SFTP port</FieldLabel>
                                        <Input
                                            id='node-daemon-sftp'
                                            aria-invalid={!!errors.daemonSftp}
                                            {...form.register('daemonSftp')}
                                        />
                                        <FieldError errors={[errors.daemonSftp]} />
                                    </Field>
                                </div>
                                <FieldDescription>
                                    The daemon runs its own SFTP management container and does not use the SSHd process
                                    on the main physical server. <strong>Do not use the same port that you have assigned
                                    for your physical server&apos;s SSH process.</strong> If you will be running the
                                    daemon behind Cloudflare you should set the daemon port to{' '}
                                    <code className='font-mono text-xs'>8443</code> to allow websocket proxying over SSL.
                                </FieldDescription>
                                <Field data-invalid={!!errors.daemonBase}>
                                    <FieldLabel htmlFor='node-daemon-base'>Daemon server file directory</FieldLabel>
                                    <Input
                                        id='node-daemon-base'
                                        aria-invalid={!!errors.daemonBase}
                                        {...form.register('daemonBase')}
                                    />
                                    <FieldDescription>
                                        Enter the directory where server files should be stored.{' '}
                                        <strong>
                                            If you use OVH you should check your partition scheme. You may need to use{' '}
                                            <code className='font-mono text-xs'>/home/daemon-data</code> to have enough
                                            space.
                                        </strong>
                                    </FieldDescription>
                                    <FieldError errors={[errors.daemonBase]} />
                                </Field>
                                <Field data-invalid={!!errors.uploadSize}>
                                    <FieldLabel htmlFor='node-upload-size'>Maximum web upload filesize</FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput
                                            id='node-upload-size'
                                            aria-invalid={!!errors.uploadSize}
                                            {...form.register('uploadSize')}
                                        />
                                        <InputGroupAddon align='inline-end'>MiB</InputGroupAddon>
                                    </InputGroup>
                                    <FieldDescription>
                                        Enter the maximum size of files that can be uploaded through the web-based file
                                        manager.
                                    </FieldDescription>
                                    <FieldError errors={[errors.uploadSize]} />
                                </Field>
                            </FieldGroup>
                        </CardContent>
                    </Card>
                    {node && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Daemon master key</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Controller
                                    control={form.control}
                                    name='resetSecret'
                                    render={({ field }) => (
                                        <Field orientation='horizontal'>
                                            <Checkbox
                                                id='node-reset-secret'
                                                checked={field.value}
                                                onCheckedChange={(checked) => field.onChange(checked === true)}
                                            />
                                            <FieldLabel htmlFor='node-reset-secret' className='font-normal'>
                                                Reset daemon master key
                                            </FieldLabel>
                                        </Field>
                                    )}
                                />
                                <FieldDescription className='mt-2'>
                                    Resetting the daemon master key will void any request coming from the old key. This
                                    key is used for all sensitive operations on the daemon including server creation and
                                    deletion. We suggest changing this key regularly for security.
                                </FieldDescription>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardFooter className='justify-end pt-6'>
                            <Button type='submit' disabled={mutation.isPending}>
                                {mutation.isPending && <Spinner />}
                                {node ? 'Save changes' : 'Create node'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </form>
    );
};

export { NodeForm };
