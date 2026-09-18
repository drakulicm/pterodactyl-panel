import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { login } from '@/api/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    username: z.string().min(1, 'A username or email must be provided.'),
    password: z.string().min(1, 'Please enter your account password.'),
});

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { getToken } = useRecaptcha();
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { username: '', password: '' },
    });

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof schema>) => login({ ...values, recaptchaData: await getToken() }),
        onSuccess: (response) => {
            if (response.complete) {
                window.location.href = response.intended ?? '/';
                return;
            }

            navigate({ to: '/auth/login/checkpoint', state: { confirmationToken: response.confirmationToken } });
        },
    });

    const handleSubmit = form.handleSubmit((values) => mutation.mutate(values));
    const isBusy = mutation.isPending || (mutation.isSuccess && mutation.data.complete);

    return (
        <AuthLayout title='Login to continue' description='Enter your account details below.'>
            <form onSubmit={handleSubmit} noValidate>
                <FieldGroup>
                    <FormError message={mutation.error ? httpErrorToHuman(mutation.error) : null} />
                    <Field data-invalid={!!form.formState.errors.username}>
                        <FieldLabel htmlFor='username'>Username or Email</FieldLabel>
                        <Input
                            id='username'
                            autoComplete='username'
                            autoFocus
                            disabled={isBusy}
                            aria-invalid={!!form.formState.errors.username}
                            {...form.register('username')}
                        />
                        <FieldError errors={[form.formState.errors.username]} />
                    </Field>
                    <Field data-invalid={!!form.formState.errors.password}>
                        <div className='flex items-center'>
                            <FieldLabel htmlFor='password'>Password</FieldLabel>
                            <Link
                                to='/auth/password'
                                className='ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline'
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <Input
                            id='password'
                            type='password'
                            autoComplete='current-password'
                            disabled={isBusy}
                            aria-invalid={!!form.formState.errors.password}
                            {...form.register('password')}
                        />
                        <FieldError errors={[form.formState.errors.password]} />
                    </Field>
                    <Button type='submit' disabled={isBusy}>
                        {isBusy && <Spinner />}
                        Login
                    </Button>
                </FieldGroup>
            </form>
        </AuthLayout>
    );
};

export { LoginPage };
