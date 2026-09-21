import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { type AdminUserPayload, languagesQueryOptions } from '@/admin/api/users';
import { FormError } from '@/components/auth/FormError';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    email: z.email('The email must be a valid email address.').max(191),
    username: z
        .string()
        .min(1, 'A username is required.')
        .max(191)
        .regex(
            /^[a-z0-9]([\w.-]+)[a-z0-9]$/i,
            'The username must start and end with alpha-numeric characters and contain only letters, numbers, dashes, underscores, and periods.',
        ),
    first_name: z.string().min(1, 'A first name is required.').max(191),
    last_name: z.string().min(1, 'A last name is required.').max(191),
    language: z.string().min(1, 'A default language is required.'),
    root_admin: z.boolean(),
    password: z.string(),
});

type UserFormValues = z.infer<typeof schema>;

const UserForm: React.FC<{
    mode: 'new' | 'edit';
    defaultValues: UserFormValues;
    isSelf?: boolean;
    isPending: boolean;
    error: unknown;
    onSubmit: (payload: AdminUserPayload) => void;
}> = ({ mode, defaultValues, isSelf, isPending, error, onSubmit }) => {
    const languages = useQuery(languagesQueryOptions);
    const languageItems = Object.entries(languages.data ?? { en: 'English' }).map(([value, label]) => ({
        value,
        label,
    }));

    const form = useForm({ resolver: zodResolver(schema), defaultValues });
    const { errors } = form.formState;

    const handleSubmit = form.handleSubmit((values) =>
        onSubmit({
            email: values.email,
            username: values.username,
            first_name: values.first_name,
            last_name: values.last_name,
            language: values.language,
            root_admin: isSelf ? defaultValues.root_admin : values.root_admin,
            password: values.password,
        }),
    );

    return (
        <form onSubmit={handleSubmit} noValidate className='flex flex-col gap-4'>
            <FormError message={error ? httpErrorToHuman(error) : null} />
            <div className='grid items-start gap-4 lg:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Identity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FieldGroup>
                            <Field data-invalid={!!errors.email}>
                                <FieldLabel htmlFor='user-email'>Email</FieldLabel>
                                <Input
                                    id='user-email'
                                    type='email'
                                    autoComplete='off'
                                    aria-invalid={!!errors.email}
                                    {...form.register('email')}
                                />
                                <FieldError errors={[errors.email]} />
                            </Field>
                            <Field data-invalid={!!errors.username}>
                                <FieldLabel htmlFor='user-username'>Username</FieldLabel>
                                <Input
                                    id='user-username'
                                    autoComplete='off'
                                    aria-invalid={!!errors.username}
                                    {...form.register('username')}
                                />
                                <FieldError errors={[errors.username]} />
                            </Field>
                            <div className='grid gap-4 sm:grid-cols-2'>
                                <Field data-invalid={!!errors.first_name}>
                                    <FieldLabel htmlFor='user-first-name'>Client first name</FieldLabel>
                                    <Input
                                        id='user-first-name'
                                        aria-invalid={!!errors.first_name}
                                        {...form.register('first_name')}
                                    />
                                    <FieldError errors={[errors.first_name]} />
                                </Field>
                                <Field data-invalid={!!errors.last_name}>
                                    <FieldLabel htmlFor='user-last-name'>Client last name</FieldLabel>
                                    <Input
                                        id='user-last-name'
                                        aria-invalid={!!errors.last_name}
                                        {...form.register('last_name')}
                                    />
                                    <FieldError errors={[errors.last_name]} />
                                </Field>
                            </div>
                            <Field data-invalid={!!errors.language}>
                                <FieldLabel htmlFor='user-language'>Default language</FieldLabel>
                                <Controller
                                    control={form.control}
                                    name='language'
                                    render={({ field }) => (
                                        <Select
                                            items={languageItems}
                                            value={field.value}
                                            onValueChange={(value) => value && field.onChange(value)}
                                        >
                                            <SelectTrigger id='user-language' className='w-full'>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {languageItems.map((language) => (
                                                    <SelectItem key={language.value} value={language.value}>
                                                        {language.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <FieldDescription>
                                    The default language to use when rendering the Panel for this user.
                                </FieldDescription>
                                <FieldError errors={[errors.language]} />
                            </Field>
                        </FieldGroup>
                    </CardContent>
                </Card>
                <div className='flex flex-col gap-4'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Permissions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Field orientation='horizontal'>
                                <Controller
                                    control={form.control}
                                    name='root_admin'
                                    render={({ field }) => (
                                        <Switch
                                            id='user-root-admin'
                                            disabled={isSelf}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <div className='flex flex-col gap-1'>
                                    <FieldLabel htmlFor='user-root-admin'>Administrator</FieldLabel>
                                    <FieldDescription>
                                        {isSelf
                                            ? 'You cannot remove your own administrative permissions.'
                                            : 'Enabling this gives a user full administrative access.'}
                                    </FieldDescription>
                                </div>
                            </Field>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Password</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                {mode === 'new' && (
                                    <Alert>
                                        <AlertDescription>
                                            Providing a user password is optional. New user emails prompt users to
                                            create a password the first time they login. If a password is provided here
                                            you will need to find a different method of providing it to the user.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <Field data-invalid={!!errors.password}>
                                    <FieldLabel htmlFor='user-password'>Password</FieldLabel>
                                    <Input
                                        id='user-password'
                                        type='password'
                                        autoComplete='new-password'
                                        aria-invalid={!!errors.password}
                                        {...form.register('password')}
                                    />
                                    {mode === 'edit' && (
                                        <FieldDescription>
                                            Leave blank to keep this user&apos;s password the same. User will not
                                            receive any notification if password is changed.
                                        </FieldDescription>
                                    )}
                                    <FieldError errors={[errors.password]} />
                                </Field>
                            </FieldGroup>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className='flex justify-end'>
                <Button type='submit' disabled={isPending}>
                    {isPending && <Spinner />}
                    {mode === 'new' ? 'Create user' : 'Update user'}
                </Button>
            </div>
        </form>
    );
};

export { UserForm };
export type { UserFormValues };
