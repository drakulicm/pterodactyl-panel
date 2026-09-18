import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TriangleAlertIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { advancedSettingsQueryOptions, updateAdvancedSettings } from '@/admin/api/settings';
import { SettingsLayout } from '@/admin/components/settings/SettingsLayout';
import { FormError } from '@/components/auth/FormError';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const STATUS_OPTIONS = [
    { value: 'true', label: 'Enabled' },
    { value: 'false', label: 'Disabled' },
];

const timeout = (label: string) =>
    z
        .string()
        .regex(/^\d+$/, `The ${label} must be a number between 1 and 60.`)
        .refine((value) => Number(value) >= 1 && Number(value) <= 60, {
            message: `The ${label} must be a number between 1 and 60.`,
        });

const port = (label: string) =>
    z
        .string()
        .regex(/^\d*$/, `The ${label} must be a number between 1024 and 65535.`)
        .refine((value) => value === '' || (Number(value) >= 1024 && Number(value) <= 65535), {
            message: `The ${label} must be a number between 1024 and 65535.`,
        });

const schema = z
    .object({
        recaptchaEnabled: z.enum(['true', 'false']),
        recaptchaWebsiteKey: z
            .string()
            .min(1, 'A reCAPTCHA site key is required.')
            .max(191, 'The site key may not exceed 191 characters.'),
        recaptchaSecretKey: z.string().max(191, 'The secret key may not exceed 191 characters.'),
        connectTimeout: timeout('connection timeout'),
        requestTimeout: timeout('request timeout'),
        allocationsEnabled: z.enum(['true', 'false']),
        rangeStart: port('starting port'),
        rangeEnd: port('ending port'),
    })
    .superRefine((values, context) => {
        if (values.allocationsEnabled !== 'true') {
            return;
        }

        if (!values.rangeStart) {
            context.addIssue({
                code: 'custom',
                path: ['rangeStart'],
                message: 'The starting port field is required when automatic allocation creation is enabled.',
            });
        }

        if (!values.rangeEnd) {
            context.addIssue({
                code: 'custom',
                path: ['rangeEnd'],
                message: 'The ending port field is required when automatic allocation creation is enabled.',
            });

            return;
        }

        if (values.rangeStart && Number(values.rangeEnd) <= Number(values.rangeStart)) {
            context.addIssue({
                code: 'custom',
                path: ['rangeEnd'],
                message: 'The ending port must be greater than the starting port.',
            });
        }
    });

type FormValues = z.infer<typeof schema>;

const StatusSelect: React.FC<{
    id: string;
    value: 'true' | 'false';
    onChange: (value: string) => void;
}> = ({ id, value, onChange }) => (
    <Select items={STATUS_OPTIONS} value={value} onValueChange={(next) => next && onChange(String(next))}>
        <SelectTrigger id={id} className='w-full'>
            <SelectValue />
        </SelectTrigger>
        <SelectContent>
            {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                    {option.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

const SettingsAdvancedPage: React.FC = () => {
    const queryClient = useQueryClient();
    const settings = useQuery(advancedSettingsQueryOptions);
    const attributes = settings.data?.attributes;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            recaptchaEnabled: 'false',
            recaptchaWebsiteKey: '',
            recaptchaSecretKey: '',
            connectTimeout: '5',
            requestTimeout: '15',
            allocationsEnabled: 'false',
            rangeStart: '',
            rangeEnd: '',
        },
        values: attributes
            ? {
                  recaptchaEnabled: attributes['recaptcha:enabled'] ? 'true' : 'false',
                  recaptchaWebsiteKey: attributes['recaptcha:website_key'] ?? '',
                  recaptchaSecretKey: '',
                  connectTimeout: String(attributes['pterodactyl:guzzle:connect_timeout'] ?? ''),
                  requestTimeout: String(attributes['pterodactyl:guzzle:timeout'] ?? ''),
                  allocationsEnabled: attributes['pterodactyl:client_features:allocations:enabled'] ? 'true' : 'false',
                  rangeStart: String(attributes['pterodactyl:client_features:allocations:range_start'] ?? ''),
                  rangeEnd: String(attributes['pterodactyl:client_features:allocations:range_end'] ?? ''),
              }
            : undefined,
    });
    const { errors } = form.formState;

    const update = useMutation({
        mutationFn: (values: FormValues) =>
            updateAdvancedSettings({
                'recaptcha:enabled': values.recaptchaEnabled === 'true',
                'recaptcha:website_key': values.recaptchaWebsiteKey,
                'recaptcha:secret_key': values.recaptchaSecretKey || undefined,
                'pterodactyl:guzzle:timeout': Number(values.requestTimeout),
                'pterodactyl:guzzle:connect_timeout': Number(values.connectTimeout),
                'pterodactyl:client_features:allocations:enabled': values.allocationsEnabled === 'true',
                'pterodactyl:client_features:allocations:range_start': values.rangeStart
                    ? Number(values.rangeStart)
                    : null,
                'pterodactyl:client_features:allocations:range_end': values.rangeEnd ? Number(values.rangeEnd) : null,
            }),
        onSuccess: () => {
            toast.success(
                'Panel settings have been updated successfully and the queue worker was restarted to apply these changes.',
            );

            return queryClient.invalidateQueries({ queryKey: ['admin', '/settings'] });
        },
    });

    const handleSubmit = form.handleSubmit((values) => update.mutate(values));

    return (
        <SettingsLayout isEnvironmentOnly={settings.data?.meta.environment_only}>
            <FormError message={settings.error ? httpErrorToHuman(settings.error) : null} />
            {settings.isPending && <Skeleton className='h-96 rounded-xl' />}
            {attributes && (
                <form onSubmit={handleSubmit} className='flex flex-col gap-4' noValidate>
                    <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                    <Card>
                        <CardHeader>
                            <CardTitle>reCAPTCHA</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <div className='grid items-start gap-6 md:grid-cols-3'>
                                    <Field>
                                        <FieldLabel htmlFor='recaptcha-enabled'>Status</FieldLabel>
                                        <Controller
                                            control={form.control}
                                            name='recaptchaEnabled'
                                            render={({ field }) => (
                                                <StatusSelect
                                                    id='recaptcha-enabled'
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <FieldDescription>
                                            If enabled, login forms and password reset forms will do a silent captcha
                                            check and display a visible captcha if needed.
                                        </FieldDescription>
                                    </Field>
                                    <Field data-invalid={!!errors.recaptchaWebsiteKey}>
                                        <FieldLabel htmlFor='recaptcha-site-key'>Site key</FieldLabel>
                                        <Input
                                            id='recaptcha-site-key'
                                            aria-invalid={!!errors.recaptchaWebsiteKey}
                                            {...form.register('recaptchaWebsiteKey')}
                                        />
                                        <FieldError errors={[errors.recaptchaWebsiteKey]} />
                                    </Field>
                                    <Field data-invalid={!!errors.recaptchaSecretKey}>
                                        <FieldLabel htmlFor='recaptcha-secret-key'>Secret key</FieldLabel>
                                        <Input
                                            id='recaptcha-secret-key'
                                            type='password'
                                            autoComplete='new-password'
                                            placeholder={
                                                attributes.has_recaptcha_secret_key
                                                    ? 'A secret key is currently set'
                                                    : ''
                                            }
                                            aria-invalid={!!errors.recaptchaSecretKey}
                                            {...form.register('recaptchaSecretKey')}
                                        />
                                        <FieldDescription>
                                            Used for communication between your site and Google. Be sure to keep it a
                                            secret. Leave blank to keep the current secret key.
                                        </FieldDescription>
                                        <FieldError errors={[errors.recaptchaSecretKey]} />
                                    </Field>
                                </div>
                                {settings.data?.meta.recaptcha_using_shipped_keys && (
                                    <Alert variant='destructive'>
                                        <TriangleAlertIcon />
                                        <AlertDescription>
                                            You are currently using reCAPTCHA keys that were shipped with this Panel.
                                            For improved security it is recommended to{' '}
                                            <a
                                                href='https://www.google.com/recaptcha/admin'
                                                target='_blank'
                                                rel='noreferrer'
                                            >
                                                generate new invisible reCAPTCHA keys
                                            </a>{' '}
                                            that are tied specifically to your website.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </FieldGroup>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>HTTP connections</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <div className='grid items-start gap-6 md:grid-cols-2'>
                                    <Field data-invalid={!!errors.connectTimeout}>
                                        <FieldLabel htmlFor='guzzle-connect-timeout'>Connection timeout</FieldLabel>
                                        <Input
                                            id='guzzle-connect-timeout'
                                            type='number'
                                            aria-invalid={!!errors.connectTimeout}
                                            {...form.register('connectTimeout')}
                                        />
                                        <FieldDescription>
                                            The amount of time in seconds to wait for a connection to be opened before
                                            throwing an error.
                                        </FieldDescription>
                                        <FieldError errors={[errors.connectTimeout]} />
                                    </Field>
                                    <Field data-invalid={!!errors.requestTimeout}>
                                        <FieldLabel htmlFor='guzzle-timeout'>Request timeout</FieldLabel>
                                        <Input
                                            id='guzzle-timeout'
                                            type='number'
                                            aria-invalid={!!errors.requestTimeout}
                                            {...form.register('requestTimeout')}
                                        />
                                        <FieldDescription>
                                            The amount of time in seconds to wait for a request to be completed before
                                            throwing an error.
                                        </FieldDescription>
                                        <FieldError errors={[errors.requestTimeout]} />
                                    </Field>
                                </div>
                            </FieldGroup>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Automatic allocation creation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <div className='grid items-start gap-6 md:grid-cols-3'>
                                    <Field>
                                        <FieldLabel htmlFor='allocations-enabled'>Status</FieldLabel>
                                        <Controller
                                            control={form.control}
                                            name='allocationsEnabled'
                                            render={({ field }) => (
                                                <StatusSelect
                                                    id='allocations-enabled'
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <FieldDescription>
                                            If enabled users will have the option to automatically create new
                                            allocations for their server via the frontend.
                                        </FieldDescription>
                                    </Field>
                                    <Field data-invalid={!!errors.rangeStart}>
                                        <FieldLabel htmlFor='allocations-range-start'>Starting port</FieldLabel>
                                        <Input
                                            id='allocations-range-start'
                                            type='number'
                                            aria-invalid={!!errors.rangeStart}
                                            {...form.register('rangeStart')}
                                        />
                                        <FieldDescription>
                                            The starting port in the range that can be automatically allocated.
                                        </FieldDescription>
                                        <FieldError errors={[errors.rangeStart]} />
                                    </Field>
                                    <Field data-invalid={!!errors.rangeEnd}>
                                        <FieldLabel htmlFor='allocations-range-end'>Ending port</FieldLabel>
                                        <Input
                                            id='allocations-range-end'
                                            type='number'
                                            aria-invalid={!!errors.rangeEnd}
                                            {...form.register('rangeEnd')}
                                        />
                                        <FieldDescription>
                                            The ending port in the range that can be automatically allocated.
                                        </FieldDescription>
                                        <FieldError errors={[errors.rangeEnd]} />
                                    </Field>
                                </div>
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
            )}
        </SettingsLayout>
    );
};

export { SettingsAdvancedPage };
