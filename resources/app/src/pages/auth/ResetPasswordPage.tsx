import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { performPasswordReset } from '@/api/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const schema = z
    .object({
        password: z.string().min(8, 'Your new password should be at least 8 characters in length.'),
        passwordConfirmation: z.string().min(1, 'Your new password does not match.'),
    })
    .refine((values) => values.password === values.passwordConfirmation, {
        path: ['passwordConfirmation'],
        message: 'Your new password does not match.',
    });

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useParams({ from: '/auth/password/reset/$token' });
    const { email } = useSearch({ from: '/auth/password/reset/$token' });
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { password: '', passwordConfirmation: '' },
    });

    const mutation = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => performPasswordReset({ email, token, ...values }),
        onSuccess: () => {
            toast.success('Your password has been reset, please login to continue.');
            navigate({ to: '/auth/login' });
        },
    });

    const handleSubmit = form.handleSubmit((values) => mutation.mutate(values));

    return (
        <AuthLayout title='Reset password'>
            <form onSubmit={handleSubmit} noValidate>
                <FieldGroup>
                    <FormError message={mutation.error ? httpErrorToHuman(mutation.error) : null} />
                    <Field>
                        <FieldLabel htmlFor='email'>Email</FieldLabel>
                        <Input id='email' value={email} disabled readOnly />
                    </Field>
                    <Field data-invalid={!!form.formState.errors.password}>
                        <FieldLabel htmlFor='password'>New Password</FieldLabel>
                        <Input
                            id='password'
                            type='password'
                            autoComplete='new-password'
                            autoFocus
                            disabled={mutation.isPending}
                            aria-invalid={!!form.formState.errors.password}
                            {...form.register('password')}
                        />
                        <FieldDescription>Passwords must be at least 8 characters in length.</FieldDescription>
                        <FieldError errors={[form.formState.errors.password]} />
                    </Field>
                    <Field data-invalid={!!form.formState.errors.passwordConfirmation}>
                        <FieldLabel htmlFor='password-confirmation'>Confirm New Password</FieldLabel>
                        <Input
                            id='password-confirmation'
                            type='password'
                            autoComplete='new-password'
                            disabled={mutation.isPending}
                            aria-invalid={!!form.formState.errors.passwordConfirmation}
                            {...form.register('passwordConfirmation')}
                        />
                        <FieldError errors={[form.formState.errors.passwordConfirmation]} />
                    </Field>
                    <Button type='submit' disabled={mutation.isPending}>
                        {mutation.isPending && <Spinner />}
                        Reset password
                    </Button>
                    <Link
                        to='/auth/login'
                        className='text-center text-sm text-muted-foreground underline-offset-4 hover:underline'
                    >
                        Return to login
                    </Link>
                </FieldGroup>
            </form>
        </AuthLayout>
    );
};

export { ResetPasswordPage };
