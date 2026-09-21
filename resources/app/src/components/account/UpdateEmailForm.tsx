import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updateAccountEmail } from '@/api/account';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';
import { useSessionStore } from '@/stores/sessionStore';

const schema = z.object({
    email: z.email('A valid email address must be provided.'),
    password: z.string().min(1, 'You must provide your current account password.'),
});

const UpdateEmailForm: React.FC = () => {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: { email: useSessionStore.getState().user?.email ?? '', password: '' },
    });

    const mutation = useMutation({
        mutationFn: updateAccountEmail,
        onSuccess: (_, values) => {
            useSessionStore.getState().setEmail(values.email);
            toast.success('Your primary email has been updated.');
            form.reset({ email: values.email, password: '' });
        },
    });

    const handleSubmit = form.handleSubmit((values) => mutation.mutate(values));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Email address</CardTitle>
                <CardDescription>Update the email address associated with your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} noValidate>
                    <FieldGroup>
                        <FormError message={mutation.error ? httpErrorToHuman(mutation.error) : null} />
                        <Field data-invalid={!!form.formState.errors.email}>
                            <FieldLabel htmlFor='account-email'>Email</FieldLabel>
                            <Input
                                id='account-email'
                                type='email'
                                autoComplete='email'
                                aria-invalid={!!form.formState.errors.email}
                                {...form.register('email')}
                            />
                            <FieldError errors={[form.formState.errors.email]} />
                        </Field>
                        <Field data-invalid={!!form.formState.errors.password}>
                            <FieldLabel htmlFor='account-email-password'>Confirm Password</FieldLabel>
                            <Input
                                id='account-email-password'
                                type='password'
                                autoComplete='current-password'
                                aria-invalid={!!form.formState.errors.password}
                                {...form.register('password')}
                            />
                            <FieldError errors={[form.formState.errors.password]} />
                        </Field>
                        <Button type='submit' className='self-start' disabled={mutation.isPending}>
                            {mutation.isPending && <Spinner />}
                            Update email
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
};

export { UpdateEmailForm };
