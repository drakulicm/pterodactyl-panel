import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { InfoIcon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { mailSettingsQueryOptions, sendTestMail, updateMailSettings } from '@/admin/api/settings';
import { SettingsLayout } from '@/admin/components/settings/SettingsLayout';
import { FormError } from '@/components/auth/FormError';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const ENCRYPTION_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'tls', label: 'Transport Layer Security (TLS)' },
    { value: 'ssl', label: 'Secure Sockets Layer (SSL)' },
];

const schema = z.object({
    host: z.string().min(1, 'An SMTP host is required.'),
    port: z
        .string()
        .regex(/^\d+$/, 'The SMTP port must be a number between 1 and 65535.')
        .refine((value) => Number(value) >= 1 && Number(value) <= 65535, {
            message: 'The SMTP port must be a number between 1 and 65535.',
        }),
    encryption: z.enum(['none', 'tls', 'ssl']),
    username: z.string().max(191, 'The username may not exceed 191 characters.'),
    password: z.string().max(191, 'The password may not exceed 191 characters.'),
    fromAddress: z.email('A valid email address is required.'),
    fromName: z.string().max(191, 'The from name may not exceed 191 characters.'),
});

type FormValues = z.infer<typeof schema>;

const SettingsMailPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [isTestOpen, setIsTestOpen] = useState(false);
    const settings = useQuery(mailSettingsQueryOptions);
    const attributes = settings.data?.attributes;
    const isDisabled = settings.data?.meta.disabled ?? false;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            host: '',
            port: '',
            encryption: 'none',
            username: '',
            password: '',
            fromAddress: '',
            fromName: '',
        },
        values: attributes
            ? {
                  host: attributes['mail:mailers:smtp:host'] ?? '',
                  port: String(attributes['mail:mailers:smtp:port'] ?? ''),
                  encryption:
                      attributes['mail:mailers:smtp:encryption'] === 'tls' ||
                      attributes['mail:mailers:smtp:encryption'] === 'ssl'
                          ? attributes['mail:mailers:smtp:encryption']
                          : 'none',
                  username: attributes['mail:mailers:smtp:username'] ?? '',
                  password: '',
                  fromAddress: attributes['mail:from:address'] ?? '',
                  fromName: attributes['mail:from:name'] ?? '',
              }
            : undefined,
    });
    const { errors } = form.formState;

    const save = useMutation({
        mutationFn: (values: FormValues) =>
            updateMailSettings({
                'mail:mailers:smtp:host': values.host,
                'mail:mailers:smtp:port': Number(values.port),
                'mail:mailers:smtp:encryption': values.encryption === 'none' ? null : values.encryption,
                'mail:mailers:smtp:username': values.username || null,
                'mail:mailers:smtp:password': values.password || undefined,
                'mail:from:address': values.fromAddress,
                'mail:from:name': values.fromName || null,
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', '/settings'] }),
    });

    const test = useMutation({
        mutationFn: sendTestMail,
        onSuccess: () => {
            setIsTestOpen(false);
            toast.success('The test message was sent successfully.');
        },
        onError: (error) => {
            setIsTestOpen(false);
            toast.error(`An error occurred while attempting to test mail settings: ${httpErrorToHuman(error)}`);
        },
    });

    const handleSave = form.handleSubmit((values) =>
        save.mutate(values, {
            onSuccess: () =>
                toast.success(
                    'Mail settings have been updated successfully and the queue worker was restarted to apply these changes.',
                ),
        }),
    );

    const handleSaveAndTest = form.handleSubmit((values) =>
        save.mutate(values, { onSuccess: () => setIsTestOpen(true) }),
    );

    return (
        <SettingsLayout isEnvironmentOnly={settings.data?.meta.environment_only}>
            <FormError message={settings.error ? httpErrorToHuman(settings.error) : null} />
            {settings.isPending && <Skeleton className='h-96 rounded-xl' />}
            {attributes && isDisabled && (
                <Card>
                    <CardHeader>
                        <CardTitle>Email settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert>
                            <InfoIcon />
                            <AlertDescription>
                                This interface is limited to instances using SMTP as the mail driver. Please either use{' '}
                                <code className='font-mono text-xs'>php artisan p:environment:mail</code> command to
                                update your email settings, or set{' '}
                                <code className='font-mono text-xs'>MAIL_DRIVER=smtp</code> in your environment file.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
            {attributes && !isDisabled && (
                <form onSubmit={handleSave} noValidate>
                    <Card>
                        <CardHeader>
                            <CardTitle>Email settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <FormError
                                    message={
                                        save.error
                                            ? `An error occurred while attempting to save mail settings: ${httpErrorToHuman(save.error)}`
                                            : null
                                    }
                                />
                                <div className='grid items-start gap-6 md:grid-cols-6'>
                                    <Field className='md:col-span-3' data-invalid={!!errors.host}>
                                        <FieldLabel htmlFor='mail-host'>SMTP host</FieldLabel>
                                        <Input id='mail-host' aria-invalid={!!errors.host} {...form.register('host')} />
                                        <FieldDescription>
                                            Enter the SMTP server address that mail should be sent through.
                                        </FieldDescription>
                                        <FieldError errors={[errors.host]} />
                                    </Field>
                                    <Field className='md:col-span-1' data-invalid={!!errors.port}>
                                        <FieldLabel htmlFor='mail-port'>SMTP port</FieldLabel>
                                        <Input
                                            id='mail-port'
                                            type='number'
                                            aria-invalid={!!errors.port}
                                            {...form.register('port')}
                                        />
                                        <FieldError errors={[errors.port]} />
                                    </Field>
                                    <Field className='md:col-span-2'>
                                        <FieldLabel htmlFor='mail-encryption'>Encryption</FieldLabel>
                                        <Controller
                                            control={form.control}
                                            name='encryption'
                                            render={({ field }) => (
                                                <Select
                                                    items={ENCRYPTION_OPTIONS}
                                                    value={field.value}
                                                    onValueChange={(value) => value && field.onChange(value)}
                                                >
                                                    <SelectTrigger id='mail-encryption' className='w-full'>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ENCRYPTION_OPTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        <FieldDescription>
                                            Select the type of encryption to use when sending mail.
                                        </FieldDescription>
                                    </Field>
                                    <Field className='md:col-span-3' data-invalid={!!errors.username}>
                                        <FieldLabel htmlFor='mail-username'>Username (optional)</FieldLabel>
                                        <Input
                                            id='mail-username'
                                            autoComplete='off'
                                            aria-invalid={!!errors.username}
                                            {...form.register('username')}
                                        />
                                        <FieldDescription>
                                            The username to use when connecting to the SMTP server.
                                        </FieldDescription>
                                        <FieldError errors={[errors.username]} />
                                    </Field>
                                    <Field className='md:col-span-3' data-invalid={!!errors.password}>
                                        <FieldLabel htmlFor='mail-password'>Password (optional)</FieldLabel>
                                        <Input
                                            id='mail-password'
                                            type='password'
                                            autoComplete='new-password'
                                            placeholder={attributes.has_password ? 'A password is currently set' : ''}
                                            aria-invalid={!!errors.password}
                                            {...form.register('password')}
                                        />
                                        <FieldDescription>
                                            The password to use in conjunction with the SMTP username. Leave blank to
                                            continue using the existing password. To set the password to an empty value
                                            enter <code className='font-mono text-xs'>!e</code> into the field.
                                        </FieldDescription>
                                        <FieldError errors={[errors.password]} />
                                    </Field>
                                </div>
                                <FieldSeparator />
                                <div className='grid items-start gap-6 md:grid-cols-2'>
                                    <Field data-invalid={!!errors.fromAddress}>
                                        <FieldLabel htmlFor='mail-from-address'>Mail from</FieldLabel>
                                        <Input
                                            id='mail-from-address'
                                            type='email'
                                            aria-invalid={!!errors.fromAddress}
                                            {...form.register('fromAddress')}
                                        />
                                        <FieldDescription>
                                            Enter an email address that all outgoing emails will originate from.
                                        </FieldDescription>
                                        <FieldError errors={[errors.fromAddress]} />
                                    </Field>
                                    <Field data-invalid={!!errors.fromName}>
                                        <FieldLabel htmlFor='mail-from-name'>Mail from name (optional)</FieldLabel>
                                        <Input
                                            id='mail-from-name'
                                            aria-invalid={!!errors.fromName}
                                            {...form.register('fromName')}
                                        />
                                        <FieldDescription>
                                            The name that emails should appear to come from.
                                        </FieldDescription>
                                        <FieldError errors={[errors.fromName]} />
                                    </Field>
                                </div>
                            </FieldGroup>
                        </CardContent>
                        <CardFooter className='justify-end gap-2'>
                            <Button type='button' variant='outline' disabled={save.isPending} onClick={handleSaveAndTest}>
                                Test
                            </Button>
                            <Button type='submit' disabled={save.isPending}>
                                {save.isPending && <Spinner />}
                                Save
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            )}
            <AlertDialog open={isTestOpen} onOpenChange={setIsTestOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Test mail settings</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your settings were saved. Click &quot;Test&quot; to send a test message to your account&apos;s
                            email address.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={test.isPending}>Cancel</AlertDialogCancel>
                        <Button disabled={test.isPending} onClick={() => test.mutate()}>
                            {test.isPending && <Spinner />}
                            Test
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SettingsLayout>
    );
};

export { SettingsMailPage };
