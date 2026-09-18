import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CircleCheckIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { requestPasswordResetEmail } from '@/api/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormError } from '@/components/auth/FormError';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    email: z.email('A valid email address must be provided to continue.'),
});

const ForgotPasswordPage: React.FC = () => {
    const { getToken } = useRecaptcha();
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { email: '' },
    });

    const mutation = useMutation({
        mutationFn: async (values: z.infer<typeof schema>) =>
            requestPasswordResetEmail({ ...values, recaptchaData: await getToken() }),
        onSuccess: () => form.reset(),
    });

    const handleSubmit = form.handleSubmit((values) => mutation.mutate(values));

    return (
        <AuthLayout title='Request password reset'>
            <form onSubmit={handleSubmit} noValidate>
                <FieldGroup>
                    <FormError message={mutation.error ? httpErrorToHuman(mutation.error) : null} />
                    {mutation.isSuccess && (
                        <Alert>
                            <CircleCheckIcon />
                            <AlertDescription>{mutation.data}</AlertDescription>
                        </Alert>
                    )}
                    <Field data-invalid={!!form.formState.errors.email}>
                        <FieldLabel htmlFor='email'>Email</FieldLabel>
                        <Input
                            id='email'
                            type='email'
                            autoComplete='email'
                            autoFocus
                            disabled={mutation.isPending}
                            aria-invalid={!!form.formState.errors.email}
                            {...form.register('email')}
                        />
                        <FieldDescription>
                            Enter your account email address to receive instructions on resetting your password.
                        </FieldDescription>
                        <FieldError errors={[form.formState.errors.email]} />
                    </Field>
                    <Button type='submit' disabled={mutation.isPending}>
                        {mutation.isPending && <Spinner />}
                        Send email
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

export { ForgotPasswordPage };
