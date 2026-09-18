import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TriangleAlertIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    type AdminServer,
    getEggVariables,
    getNestEggs,
    getServerVariables,
    serverEggQueryOptions,
    serverNestsQueryOptions,
    updateServerStartup,
} from '@/admin/api/servers';
import { EggVariableFields } from '@/admin/components/servers/EggVariableFields';
import { FormError } from '@/components/auth/FormError';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    startup: z.string().min(1, 'A startup command is required.'),
    nestId: z.string().min(1, 'A nest must be selected.'),
    eggId: z.string().min(1, 'An egg must be selected.'),
    dockerImage: z.string(),
    customImage: z.string(),
    skipScripts: z.boolean(),
    environment: z.record(z.string(), z.string()),
});

type FormValues = z.infer<typeof schema>;

const ServerStartupTab: React.FC<{ server: AdminServer }> = ({ server }) => {
    const queryClient = useQueryClient();
    const nests = useQuery(serverNestsQueryOptions);
    const appliedEggRef = useRef<string>(String(server.egg));

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            startup: server.container.startup_command,
            nestId: String(server.nest),
            eggId: String(server.egg),
            dockerImage: server.container.image,
            customImage: '',
            skipScripts: server.container.skip_scripts,
            environment: Object.fromEntries(
                getServerVariables(server).map((variable) => [
                    variable.env_variable,
                    variable.server_value ?? variable.default_value ?? '',
                ]),
            ),
        },
    });
    const { errors } = form.formState;
    const nestId = form.watch('nestId');
    const eggId = form.watch('eggId');
    const environment = form.watch('environment');
    const dockerImage = form.watch('dockerImage');

    const egg = useQuery(serverEggQueryOptions(nestId ? Number(nestId) : null, eggId ? Number(eggId) : null));

    const nestItems = (nests.data?.items ?? []).map((nest) => ({ value: String(nest.id), label: nest.name }));
    const eggItems = (nests.data?.items ?? [])
        .filter((nest) => String(nest.id) === nestId)
        .flatMap((nest) => getNestEggs(nest).map((item) => ({ value: String(item.id), label: item.name })));
    const imageItems = Object.entries(egg.data?.docker_images ?? {}).map(([label, image]) => ({
        value: image,
        label: `${label} (${image})`,
    }));
    const isCustomImage = !!egg.data && !imageItems.some((item) => item.value === server.container.image);

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

    useEffect(() => {
        if (isCustomImage && String(server.egg) === eggId && !form.getValues('customImage')) {
            form.setValue('customImage', server.container.image);
        }
    }, [eggId, form, isCustomImage, server.container.image, server.egg]);

    const variables = egg.data
        ? String(egg.data.id) === String(server.egg)
            ? getServerVariables(server)
            : getEggVariables(egg.data)
        : [];

    const update = useMutation({
        mutationFn: (values: FormValues) =>
            updateServerStartup(server.id, {
                startup: values.startup,
                environment: values.environment,
                egg: Number(values.eggId),
                image: values.customImage.trim() || values.dockerImage,
                skip_scripts: values.skipScripts,
            }),
        onSuccess: async () => {
            toast.success('Startup configuration has been updated.');
            await queryClient.invalidateQueries({ queryKey: ['admin', `/servers/${server.id}`] });
            await queryClient.invalidateQueries({ queryKey: ['admin', '/servers'] });
        },
    });

    const handleSubmit = form.handleSubmit((values) => update.mutate(values));

    return (
        <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
            <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
            <Card>
                <CardHeader>
                    <CardTitle>Startup command modification</CardTitle>
                </CardHeader>
                <CardContent className='flex flex-col gap-6'>
                    <Field data-invalid={!!errors.startup}>
                        <FieldLabel htmlFor='startup-command'>Startup command</FieldLabel>
                        <Input id='startup-command' aria-invalid={!!errors.startup} {...form.register('startup')} />
                        <FieldDescription>
                            Edit your server&apos;s startup command here. The following variables are available by
                            default: <code className='font-mono'>{'{{SERVER_MEMORY}}'}</code>,{' '}
                            <code className='font-mono'>{'{{SERVER_IP}}'}</code>, and{' '}
                            <code className='font-mono'>{'{{SERVER_PORT}}'}</code>.
                        </FieldDescription>
                        <FieldError errors={[errors.startup]} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='startup-default'>Default service start command</FieldLabel>
                        <Input id='startup-default' readOnly value={egg.data?.startup ?? ''} />
                    </Field>
                </CardContent>
            </Card>

            <div className='grid gap-4 lg:grid-cols-2'>
                <div className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Service configuration</CardTitle>
                        </CardHeader>
                        <CardContent className='flex flex-col gap-6'>
                            <Alert variant='destructive'>
                                <TriangleAlertIcon />
                                <AlertTitle>This is a destructive operation in many cases.</AlertTitle>
                                <AlertDescription>
                                    Changing any of the below values will result in the server processing a re-install
                                    command. The server will be stopped and will then proceed. If you would like the
                                    service scripts to not run, ensure the box is checked at the bottom. This server will
                                    be stopped immediately in order for this action to proceed.
                                </AlertDescription>
                            </Alert>
                            <Field data-invalid={!!errors.nestId}>
                                <FieldLabel htmlFor='startup-nest'>Nest</FieldLabel>
                                {nests.isPending ? (
                                    <Skeleton className='h-8 rounded-lg' />
                                ) : (
                                    <Select
                                        items={nestItems}
                                        value={nestId}
                                        onValueChange={(value) => value && form.setValue('nestId', String(value))}
                                    >
                                        <SelectTrigger id='startup-nest' className='w-full'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {nestItems.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <FieldDescription>Select the nest that this server will be grouped into.</FieldDescription>
                                <FieldError errors={[errors.nestId]} />
                            </Field>
                            <Field data-invalid={!!errors.eggId}>
                                <FieldLabel htmlFor='startup-egg'>Egg</FieldLabel>
                                <Select
                                    items={eggItems}
                                    value={eggId || null}
                                    onValueChange={(value) => value && form.setValue('eggId', String(value))}
                                >
                                    <SelectTrigger id='startup-egg' className='w-full'>
                                        <SelectValue placeholder='Select a nest egg' />
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
                                    Select the egg that will provide processing data for this server.
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
                                    install. If you would like to skip this step, check this box.
                                </FieldDescription>
                            </Field>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Docker image configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Field>
                                <FieldLabel htmlFor='startup-image'>Image</FieldLabel>
                                <Select
                                    items={imageItems}
                                    value={dockerImage || null}
                                    onValueChange={(value) => {
                                        if (!value) {
                                            return;
                                        }

                                        form.setValue('dockerImage', String(value));
                                        form.setValue('customImage', '');
                                    }}
                                >
                                    <SelectTrigger id='startup-image' className='w-full'>
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
                                <Input placeholder='Or enter a custom image...' {...form.register('customImage')} />
                                <FieldDescription>
                                    This is the Docker image that will be used to run this server. Select an image from
                                    the dropdown or enter a custom image in the text field above.
                                </FieldDescription>
                            </Field>
                        </CardContent>
                        <CardFooter className='justify-end'>
                            <Button type='submit' disabled={update.isPending}>
                                {update.isPending && <Spinner />}
                                Save modifications
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                <div className='flex flex-col gap-2'>
                    <h3 className='text-sm font-medium'>Service variables</h3>
                    {egg.isPending ? (
                        <Skeleton className='h-64 rounded-xl' />
                    ) : (
                        <EggVariableFields
                            variables={variables}
                            values={environment}
                            onChange={(envVariable, value) =>
                                form.setValue('environment', { ...environment, [envVariable]: value })
                            }
                        />
                    )}
                </div>
            </div>
        </form>
    );
};

export { ServerStartupTab };
