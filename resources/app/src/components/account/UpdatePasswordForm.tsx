import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { updateAccountPassword } from '@/api/account';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const schema = z
    .object({
        current: z.string().min(1, 'You must provide your current account password.'),
        password: z.string().min(8, 'Your new password should be at least 8 characters in length.'),
        confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Password confirmation does not match the password you entered.',
    });

const UpdatePasswordForm: React.FC = () => {
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { current: '', password: '', confirmPassword: '' },
    });

    const mutation = useMutation({
        mutationFn: updateAccountPassword,
        onSuccess: () => {
            window.location.href = '/auth/login';
        },
    });

    const handleSubmit = form.handleSubmit((values) => mutation.mutate(values));
    const isBusy = mutation.isPending || mutation.isSuccess;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Changing your password signs you out of all sessions.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} noValidate>
                    <FieldGroup>
                        <FormError message={mutation.error ? httpErrorToHuman(mutation.error) : null} />
                        <Field data-invalid={!!form.formState.errors.current}>
                            <FieldLabel htmlFor='current-password'>Current Password</FieldLabel>
                            <Input
                                id='current-password'
                                type='password'
                                autoComplete='current-password'
                                aria-invalid={!!form.formState.errors.current}
                                {...form.register('current')}
                            />
                            <FieldError errors={[form.formState.errors.current]} />
                        </Field>
                        <Field data-invalid={!!form.formState.errors.password}>
                            <FieldLabel htmlFor='new-password'>New Password</FieldLabel>
                            <Input
                                id='new-password'
                                type='password'
                                autoComplete='new-password'
                                aria-invalid={!!form.formState.errors.password}
                                {...form.register('password')}
                            />
                            <FieldDescription>
                                Your new password should be at least 8 characters in length and unique to this website.
                            </FieldDescription>
                            <FieldError errors={[form.formState.errors.password]} />
                        </Field>
                        <Field data-invalid={!!form.formState.errors.confirmPassword}>
                            <FieldLabel htmlFor='confirm-password'>Confirm New Password</FieldLabel>
                            <Input
                                id='confirm-password'
                                type='password'
                                autoComplete='new-password'
                                aria-invalid={!!form.formState.errors.confirmPassword}
                                {...form.register('confirmPassword')}
                            />
                            <FieldError errors={[form.formState.errors.confirmPassword]} />
                        </Field>
                        <Button type='submit' className='self-start' disabled={isBusy}>
                            {isBusy && <Spinner />}
                            Update password
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
};

export { UpdatePasswordForm };
