import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { KeyRoundIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createSSHKey, deleteSSHKey, sshKeysQueryOptions } from '@/api/account';
import { FormError } from '@/components/auth/FormError';
import { ConfirmDeleteButton } from '@/components/layout/ConfirmDeleteButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    name: z.string().min(1, 'A name for this key is required.'),
    publicKey: z.string().min(1, 'A public key is required.'),
});

const AccountSSHPage: React.FC = () => {
    const queryClient = useQueryClient();
    const keys = useQuery(sshKeysQueryOptions);
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', publicKey: '' },
    });

    const create = useMutation({
        mutationFn: createSSHKey,
        onSuccess: () => {
            form.reset();
            queryClient.invalidateQueries({ queryKey: sshKeysQueryOptions.queryKey });
        },
    });

    const remove = useMutation({
        mutationFn: deleteSSHKey,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: sshKeysQueryOptions.queryKey }),
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleSubmit = form.handleSubmit((values) => create.mutate(values));

    return (
        <>
            <PageHeader title='SSH keys' />
            <div className='mx-auto grid w-full max-w-5xl items-start gap-4 p-4 lg:grid-cols-5'>
                <Card className='lg:col-span-2'>
                    <CardHeader>
                        <CardTitle>Add SSH key</CardTitle>
                        <CardDescription>SSH keys let you connect over SFTP without a password.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} noValidate>
                            <FieldGroup>
                                <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                                <Field data-invalid={!!form.formState.errors.name}>
                                    <FieldLabel htmlFor='ssh-key-name'>SSH Key Name</FieldLabel>
                                    <Input
                                        id='ssh-key-name'
                                        aria-invalid={!!form.formState.errors.name}
                                        {...form.register('name')}
                                    />
                                    <FieldError errors={[form.formState.errors.name]} />
                                </Field>
                                <Field data-invalid={!!form.formState.errors.publicKey}>
                                    <FieldLabel htmlFor='ssh-public-key'>Public Key</FieldLabel>
                                    <Textarea
                                        id='ssh-public-key'
                                        rows={6}
                                        className='font-mono text-xs'
                                        aria-invalid={!!form.formState.errors.publicKey}
                                        {...form.register('publicKey')}
                                    />
                                    <FieldDescription>Enter your public SSH key.</FieldDescription>
                                    <FieldError errors={[form.formState.errors.publicKey]} />
                                </Field>
                                <Button type='submit' className='self-start' disabled={create.isPending}>
                                    {create.isPending && <Spinner />}
                                    Save
                                </Button>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>
                <Card className='lg:col-span-3'>
                    <CardHeader>
                        <CardTitle>SSH keys</CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col gap-2'>
                        <FormError message={keys.error ? httpErrorToHuman(keys.error) : null} />
                        {keys.isPending ? (
                            <Skeleton className='h-24' />
                        ) : keys.data?.length ? (
                            keys.data.map((key) => (
                                <div key={key.fingerprint} className='flex items-center gap-3 rounded-lg border p-3'>
                                    <KeyRoundIcon className='size-4 shrink-0 text-muted-foreground' />
                                    <div className='flex min-w-0 flex-1 flex-col'>
                                        <span className='truncate text-sm font-medium'>{key.name}</span>
                                        <span className='truncate font-mono text-xs text-muted-foreground'>
                                            SHA256:{key.fingerprint}
                                        </span>
                                        <span className='text-xs text-muted-foreground'>
                                            Added on {format(key.createdAt, 'MMM do, yyyy HH:mm')}
                                        </span>
                                    </div>
                                    <ConfirmDeleteButton
                                        title='Delete SSH key'
                                        description={`Removing the ${key.name} key will invalidate its usage across the panel.`}
                                        label={`Delete ${key.name}`}
                                        disabled={remove.isPending}
                                        onConfirm={() => remove.mutate(key.fingerprint)}
                                    />
                                </div>
                            ))
                        ) : (
                            !keys.error && (
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant='icon'>
                                            <KeyRoundIcon />
                                        </EmptyMedia>
                                        <EmptyTitle>No SSH keys</EmptyTitle>
                                        <EmptyDescription>No SSH keys exist for this account.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export { AccountSSHPage };
