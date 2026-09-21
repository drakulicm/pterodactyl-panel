import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { generalSettingsQueryOptions, updateGeneralSettings } from '@/admin/api/settings';
import { SettingsLayout } from '@/admin/components/settings/SettingsLayout';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const TWO_FACTOR_LEVELS = [
    { value: '0', label: 'Not required' },
    { value: '1', label: 'Admin only' },
    { value: '2', label: 'All users' },
] as const;

const schema = z.object({
    name: z.string().min(1, 'A company name is required.').max(191, 'The company name may not exceed 191 characters.'),
    locale: z.string().min(1, 'A default language is required.'),
    twoFactor: z.enum(['0', '1', '2']),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = { name: '', locale: 'en', twoFactor: '0' };

const SettingsGeneralPage: React.FC = () => {
    const queryClient = useQueryClient();
    const settings = useQuery(generalSettingsQueryOptions);
    const attributes = settings.data?.attributes;
    const languages = Object.entries(settings.data?.meta.languages ?? {}).map(([value, label]) => ({ value, label }));

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: DEFAULT_VALUES,
        values: attributes
            ? {
                  name: attributes['app:name'],
                  locale: attributes['app:locale'],
                  twoFactor: String(attributes['pterodactyl:auth:2fa_required']) as FormValues['twoFactor'],
              }
            : undefined,
    });
    const { errors } = form.formState;

    const update = useMutation({
        mutationFn: updateGeneralSettings,
        onSuccess: () => {
            toast.success(
                'Panel settings have been updated successfully and the queue worker was restarted to apply these changes.',
            );

            return queryClient.invalidateQueries({ queryKey: ['admin', '/settings'] });
        },
    });

    const handleSubmit = form.handleSubmit((values) =>
        update.mutate({
            'app:name': values.name,
            'app:locale': values.locale,
            'pterodactyl:auth:2fa_required': Number(values.twoFactor),
        }),
    );

    return (
        <SettingsLayout isEnvironmentOnly={settings.data?.meta.environment_only}>
            <FormError message={settings.error ? httpErrorToHuman(settings.error) : null} />
            {settings.isPending && <Skeleton className='h-72 rounded-xl' />}
            {attributes && (
                <form onSubmit={handleSubmit} noValidate>
                    <Card>
                        <CardHeader>
                            <CardTitle>Panel settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                                <div className='grid items-start gap-6 md:grid-cols-3'>
                                    <Field data-invalid={!!errors.name}>
                                        <FieldLabel htmlFor='settings-name'>Company name</FieldLabel>
                                        <Input
                                            id='settings-name'
                                            aria-invalid={!!errors.name}
                                            {...form.register('name')}
                                        />
                                        <FieldDescription>
                                            This is the name that is used throughout the panel and in emails sent to
                                            clients.
                                        </FieldDescription>
                                        <FieldError errors={[errors.name]} />
                                    </Field>
                                    <Field>
                                        <FieldLabel id='settings-2fa-label'>Require 2-factor authentication</FieldLabel>
                                        <Controller
                                            control={form.control}
                                            name='twoFactor'
                                            render={({ field }) => (
                                                <RadioGroup
                                                    aria-labelledby='settings-2fa-label'
                                                    value={field.value}
                                                    onValueChange={(value) => field.onChange(String(value))}
                                                >
                                                    {TWO_FACTOR_LEVELS.map((level) => (
                                                        <label
                                                            key={level.value}
                                                            className='flex items-center gap-2 text-sm'
                                                        >
                                                            <RadioGroupItem value={level.value} />
                                                            {level.label}
                                                        </label>
                                                    ))}
                                                </RadioGroup>
                                            )}
                                        />
                                        <FieldDescription>
                                            If enabled, any account falling into the selected grouping will be required
                                            to have 2-factor authentication enabled to use the Panel.
                                        </FieldDescription>
                                    </Field>
                                    <Field data-invalid={!!errors.locale}>
                                        <FieldLabel htmlFor='settings-locale'>Default language</FieldLabel>
                                        <Controller
                                            control={form.control}
                                            name='locale'
                                            render={({ field }) => (
                                                <Select
                                                    items={languages}
                                                    value={field.value}
                                                    onValueChange={(value) => value && field.onChange(value)}
                                                >
                                                    <SelectTrigger id='settings-locale' className='w-full'>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {languages.map((language) => (
                                                            <SelectItem key={language.value} value={language.value}>
                                                                {language.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        <FieldDescription>
                                            The default language to use when rendering UI components.
                                        </FieldDescription>
                                        <FieldError errors={[errors.locale]} />
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

export { SettingsGeneralPage };
