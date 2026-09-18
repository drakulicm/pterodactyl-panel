import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import type { AdminEgg, AdminEggPayload, AdminNest } from '@/admin/api/nests';
import { fromDockerImagesText } from '@/admin/api/nests';
import { FormError } from '@/components/auth/FormError';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const isJsonObject = (value: string): boolean => {
    try {
        const parsed: unknown = JSON.parse(value);

        return !!parsed && typeof parsed === 'object';
    } catch {
        return false;
    }
};

const JSON_FIELDS = ['config_startup', 'config_logs', 'config_files'] as const;

const schema = z
    .object({
        name: z.string().min(1, 'An egg name is required.').max(191),
        description: z.string(),
        docker_images: z.string().min(1, 'At least one docker image is required.'),
        startup: z.string().min(1, 'A startup command is required.'),
        features: z.string(),
        file_denylist: z.string(),
        force_outgoing_ip: z.boolean(),
        config_from: z.string(),
        config_stop: z.string(),
        config_startup: z.string(),
        config_logs: z.string(),
        config_files: z.string(),
    })
    .superRefine((values, context) => {
        const isInherited = values.config_from !== '';

        if (!isInherited && values.config_stop.trim() === '') {
            context.addIssue({
                code: 'custom',
                path: ['config_stop'],
                message: 'A stop command is required unless settings are copied from another egg.',
            });
        }

        JSON_FIELDS.forEach((field) => {
            const value = values[field].trim();

            if (value === '') {
                if (!isInherited) {
                    context.addIssue({
                        code: 'custom',
                        path: [field],
                        message: 'This field is required unless settings are copied from another egg.',
                    });
                }

                return;
            }

            if (!isJsonObject(value)) {
                context.addIssue({ code: 'custom', path: [field], message: 'This must be a valid JSON object.' });
            }
        });
    });

type EggFormValues = z.infer<typeof schema>;

const toList = (value: string): string[] =>
    value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

const toJsonValue = (value: string): unknown => (value.trim() === '' ? null : JSON.parse(value));

const toEggPayload = (values: EggFormValues): AdminEggPayload => ({
    name: values.name,
    description: values.description.trim() || null,
    docker_images: fromDockerImagesText(values.docker_images),
    startup: values.startup,
    features: toList(values.features),
    file_denylist: toList(values.file_denylist),
    force_outgoing_ip: values.force_outgoing_ip,
    config_from: values.config_from === '' ? null : Number(values.config_from),
    config_stop: values.config_stop.trim() || null,
    config_startup: toJsonValue(values.config_startup),
    config_logs: toJsonValue(values.config_logs),
    config_files: toJsonValue(values.config_files),
});

const EggConfigurationForm: React.FC<{
    mode: 'new' | 'edit';
    defaultValues: EggFormValues;
    nests: AdminNest[];
    nestId: number | undefined;
    eggsInNest: AdminEgg[];
    egg?: AdminEgg;
    isPending: boolean;
    error: unknown;
    footer?: ReactNode;
    onNestChange?: (nestId: number) => void;
    onSubmit: (payload: AdminEggPayload) => void;
}> = ({
    mode,
    defaultValues,
    nests,
    nestId,
    eggsInNest,
    egg,
    isPending,
    error,
    footer,
    onNestChange,
    onSubmit,
}) => {
    const form = useForm<EggFormValues>({ resolver: zodResolver(schema), values: defaultValues });
    const { errors } = form.formState;

    const nestItems = nests.map((nest) => ({ value: String(nest.id), label: `${nest.name} <${nest.author}>` }));
    const configFromItems = [
        { value: '', label: 'None' },
        ...eggsInNest
            .filter((option) => option.id !== egg?.id)
            .map((option) => ({ value: String(option.id), label: `${option.name} <${option.author}>` })),
    ];

    return (
        <form onSubmit={form.handleSubmit((values) => onSubmit(toEggPayload(values)))} noValidate className='flex flex-col gap-4'>
            <FormError message={error ? httpErrorToHuman(error) : null} />
            <Card>
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='grid items-start gap-6 lg:grid-cols-2'>
                        <FieldGroup>
                            {mode === 'new' && (
                                <Field>
                                    <FieldLabel htmlFor='egg-nest'>Associated nest</FieldLabel>
                                    <Select
                                        items={nestItems}
                                        value={nestId === undefined ? '' : String(nestId)}
                                        onValueChange={(value) => value && onNestChange?.(Number(value))}
                                    >
                                        <SelectTrigger id='egg-nest' className='w-full'>
                                            <SelectValue placeholder='Select a nest' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {nestItems.map((nest) => (
                                                <SelectItem key={nest.value} value={nest.value}>
                                                    {nest.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        Think of a Nest as a category. You can put multiple Eggs in a nest, but consider
                                        putting only Eggs that are related to each other in each Nest.
                                    </FieldDescription>
                                </Field>
                            )}
                            <Field data-invalid={!!errors.name}>
                                <FieldLabel htmlFor='egg-name'>Name</FieldLabel>
                                <Input id='egg-name' aria-invalid={!!errors.name} {...form.register('name')} />
                                <FieldDescription>
                                    A simple, human-readable name to use as an identifier for this Egg. This is what
                                    users will see as their game server type.
                                </FieldDescription>
                                <FieldError errors={[errors.name]} />
                            </Field>
                            {egg && (
                                <>
                                    <Field>
                                        <FieldLabel htmlFor='egg-uuid'>UUID</FieldLabel>
                                        <Input id='egg-uuid' readOnly className='font-mono text-xs' value={egg.uuid} />
                                        <FieldDescription>
                                            This is the globally unique identifier for this Egg which the Daemon uses as
                                            an identifier.
                                        </FieldDescription>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor='egg-author'>Author</FieldLabel>
                                        <Input id='egg-author' readOnly value={egg.author} />
                                        <FieldDescription>
                                            The author of this version of the Egg. Uploading a new Egg configuration
                                            from a different author will change this.
                                        </FieldDescription>
                                    </Field>
                                </>
                            )}
                            <Field data-invalid={!!errors.docker_images}>
                                <FieldLabel htmlFor='egg-docker-images'>Docker images</FieldLabel>
                                <Textarea
                                    id='egg-docker-images'
                                    rows={4}
                                    className='font-mono text-xs'
                                    placeholder='ghcr.io/pterodactyl/yolks:java_21'
                                    aria-invalid={!!errors.docker_images}
                                    {...form.register('docker_images')}
                                />
                                <FieldDescription>
                                    The docker images available to servers using this egg. Enter one per line. Users
                                    will be able to select from this list of images if more than one value is provided.
                                    Optionally, a display name may be provided by prefixing the image with the name
                                    followed by a pipe character, and then the image URL. Example:{' '}
                                    <code className='font-mono text-xs'>Display Name|ghcr.io/my/egg</code>
                                </FieldDescription>
                                <FieldError errors={[errors.docker_images]} />
                            </Field>
                            <Field orientation='horizontal'>
                                <Controller
                                    control={form.control}
                                    name='force_outgoing_ip'
                                    render={({ field }) => (
                                        <Switch
                                            id='egg-force-outgoing-ip'
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <div className='flex flex-col gap-1'>
                                    <FieldLabel htmlFor='egg-force-outgoing-ip'>Force outgoing IP</FieldLabel>
                                    <FieldDescription>
                                        Forces all outgoing network traffic to have its Source IP NATed to the IP of the
                                        server&apos;s primary allocation IP. Required for certain games to work properly
                                        when the Node has multiple public IP addresses.{' '}
                                        <strong>
                                            Enabling this option will disable internal networking for any servers using
                                            this egg, causing them to be unable to internally access other servers on
                                            the same node.
                                        </strong>
                                    </FieldDescription>
                                </div>
                            </Field>
                        </FieldGroup>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor='egg-description'>Description</FieldLabel>
                                <Textarea id='egg-description' rows={6} {...form.register('description')} />
                                <FieldDescription>
                                    A description of this Egg that will be displayed throughout the Panel as needed.
                                </FieldDescription>
                            </Field>
                            <Field data-invalid={!!errors.startup}>
                                <FieldLabel htmlFor='egg-startup'>Startup command</FieldLabel>
                                <Textarea
                                    id='egg-startup'
                                    rows={6}
                                    className='font-mono text-xs'
                                    aria-invalid={!!errors.startup}
                                    {...form.register('startup')}
                                />
                                <FieldDescription>
                                    The default startup command that should be used for new servers created with this
                                    Egg. You can change this per-server as needed.
                                </FieldDescription>
                                <FieldError errors={[errors.startup]} />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='egg-features'>Features</FieldLabel>
                                <Input id='egg-features' placeholder='eula, java_version' {...form.register('features')} />
                                <FieldDescription>
                                    Additional features belonging to the egg, separated by commas. Useful for
                                    configuring additional panel modifications.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='egg-file-denylist'>File denylist</FieldLabel>
                                <Textarea
                                    id='egg-file-denylist'
                                    rows={3}
                                    className='font-mono text-xs'
                                    {...form.register('file_denylist')}
                                />
                                <FieldDescription>
                                    Files that servers using this egg may not edit, one per line. This list is only
                                    stored when the egg is created; the API ignores it on updates.
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Process management</CardTitle>
                </CardHeader>
                <CardContent>
                    <FieldGroup>
                        <Alert variant='destructive'>
                            <AlertDescription>
                                {mode === 'edit' && (
                                    <p>
                                        The following configuration options should not be edited unless you understand
                                        how this system works. If wrongly modified it is possible for the daemon to
                                        break.
                                    </p>
                                )}
                                <p>
                                    All fields are required unless you select a separate option from the &quot;Copy
                                    settings from&quot; dropdown, in which case fields may be left blank to use the
                                    values from that Egg.
                                </p>
                            </AlertDescription>
                        </Alert>
                        <div className='grid items-start gap-6 lg:grid-cols-2'>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor='egg-config-from'>Copy settings from</FieldLabel>
                                    <Controller
                                        control={form.control}
                                        name='config_from'
                                        render={({ field }) => (
                                            <Select
                                                items={configFromItems}
                                                value={field.value}
                                                onValueChange={(value) => field.onChange(String(value ?? ''))}
                                            >
                                                <SelectTrigger id='egg-config-from' className='w-full'>
                                                    <SelectValue placeholder='None' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {configFromItems.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <FieldDescription>
                                        If you would like to default to settings from another Egg select it from the
                                        menu above.
                                    </FieldDescription>
                                </Field>
                                <Field data-invalid={!!errors.config_stop}>
                                    <FieldLabel htmlFor='egg-config-stop'>Stop command</FieldLabel>
                                    <Input
                                        id='egg-config-stop'
                                        className='font-mono text-xs'
                                        aria-invalid={!!errors.config_stop}
                                        {...form.register('config_stop')}
                                    />
                                    <FieldDescription>
                                        The command that should be sent to server processes to stop them gracefully. If
                                        you need to send a <code className='font-mono text-xs'>SIGINT</code> you should
                                        enter <code className='font-mono text-xs'>^C</code> here.
                                    </FieldDescription>
                                    <FieldError errors={[errors.config_stop]} />
                                </Field>
                                <Field data-invalid={!!errors.config_logs}>
                                    <FieldLabel htmlFor='egg-config-logs'>Log configuration</FieldLabel>
                                    <Textarea
                                        id='egg-config-logs'
                                        rows={8}
                                        className='font-mono text-xs'
                                        aria-invalid={!!errors.config_logs}
                                        {...form.register('config_logs')}
                                    />
                                    <FieldDescription>
                                        This should be a JSON representation of where log files are stored, and whether
                                        or not the daemon should be creating custom logs.
                                    </FieldDescription>
                                    <FieldError errors={[errors.config_logs]} />
                                </Field>
                            </FieldGroup>
                            <FieldGroup>
                                <Field data-invalid={!!errors.config_files}>
                                    <FieldLabel htmlFor='egg-config-files'>Configuration files</FieldLabel>
                                    <Textarea
                                        id='egg-config-files'
                                        rows={8}
                                        className='font-mono text-xs'
                                        aria-invalid={!!errors.config_files}
                                        {...form.register('config_files')}
                                    />
                                    <FieldDescription>
                                        This should be a JSON representation of configuration files to modify and what
                                        parts should be changed.
                                    </FieldDescription>
                                    <FieldError errors={[errors.config_files]} />
                                </Field>
                                <Field data-invalid={!!errors.config_startup}>
                                    <FieldLabel htmlFor='egg-config-startup'>Start configuration</FieldLabel>
                                    <Textarea
                                        id='egg-config-startup'
                                        rows={8}
                                        className='font-mono text-xs'
                                        aria-invalid={!!errors.config_startup}
                                        {...form.register('config_startup')}
                                    />
                                    <FieldDescription>
                                        This should be a JSON representation of what values the daemon should be looking
                                        for when booting a server to determine completion.
                                    </FieldDescription>
                                    <FieldError errors={[errors.config_startup]} />
                                </Field>
                            </FieldGroup>
                        </div>
                    </FieldGroup>
                </CardContent>
                <CardFooter className='justify-between gap-2'>
                    <div className='flex items-center gap-2'>{footer}</div>
                    <Button type='submit' disabled={isPending || (mode === 'new' && nestId === undefined)}>
                        {isPending && <Spinner />}
                        {mode === 'new' ? 'Create' : 'Save'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export { EggConfigurationForm };
export type { EggFormValues };
