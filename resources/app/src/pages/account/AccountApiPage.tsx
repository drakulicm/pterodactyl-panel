import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { KeyRoundIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { apiKeysQueryOptions, createApiKey, deleteApiKey } from '@/api/account';
import { FormError } from '@/components/auth/FormError';
import { ConfirmDeleteButton } from '@/components/layout/ConfirmDeleteButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    description: z.string().min(4, 'A description of at least 4 characters is required.'),
    allowedIps: z.string(),
});

const AccountApiPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [createdToken, setCreatedToken] = useState<string | null>(null);
    const keys = useQuery(apiKeysQueryOptions);
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: { description: '', allowedIps: '' },
    });

    const create = useMutation({
        mutationFn: createApiKey,
        onSuccess: (key) => {
            form.reset();
            setCreatedToken(`${key.identifier}${key.secretToken}`);
            queryClient.invalidateQueries({ queryKey: apiKeysQueryOptions.queryKey });
        },
    });

    const remove = useMutation({
        mutationFn: deleteApiKey,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysQueryOptions.queryKey }),
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleSubmit = form.handleSubmit((values) => create.mutate(values));

    const handleCopy = async () => {
        if (!createdToken) {
            return;
        }

        await navigator.clipboard.writeText(createdToken);
        toast.success('API key copied to clipboard.');
    };

    return (
        <>
            <PageHeader title='API credentials' />
            <div className='mx-auto grid w-full max-w-5xl items-start gap-4 p-4 lg:grid-cols-5'>
                <Card className='lg:col-span-2'>
                    <CardHeader>
                        <CardTitle>Create API key</CardTitle>
                        <CardDescription>Keys act on behalf of your account through the client API.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} noValidate>
                            <FieldGroup>
                                <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                                <Field data-invalid={!!form.formState.errors.description}>
                                    <FieldLabel htmlFor='api-key-description'>Description</FieldLabel>
                                    <Input
                                        id='api-key-description'
                                        aria-invalid={!!form.formState.errors.description}
                                        {...form.register('description')}
                                    />
                                    <FieldError errors={[form.formState.errors.description]} />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor='api-key-ips'>Allowed IPs</FieldLabel>
                                    <Textarea id='api-key-ips' rows={3} {...form.register('allowedIps')} />
                                    <FieldDescription>
                                        Leave blank to allow any IP address, otherwise provide one address per line.
                                    </FieldDescription>
                                </Field>
                                <Button type='submit' className='self-start' disabled={create.isPending}>
                                    {create.isPending && <Spinner />}
                                    Create
                                </Button>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>
                <Card className='lg:col-span-3'>
                    <CardHeader>
                        <CardTitle>API keys</CardTitle>
                    </CardHeader>
                    <CardContent className='flex flex-col gap-2'>
                        <FormError message={keys.error ? httpErrorToHuman(keys.error) : null} />
                        {keys.isPending ? (
                            <Skeleton className='h-24' />
                        ) : keys.data?.length ? (
                            keys.data.map((key) => (
                                <div key={key.identifier} className='flex items-center gap-3 rounded-lg border p-3'>
                                    <KeyRoundIcon className='size-4 shrink-0 text-muted-foreground' />
                                    <div className='flex min-w-0 flex-1 flex-col'>
                                        <span className='truncate text-sm font-medium'>{key.description}</span>
                                        <span className='text-xs text-muted-foreground'>
                                            Last used:{' '}
                                            {key.lastUsedAt ? format(key.lastUsedAt, 'MMM do, yyyy HH:mm') : 'Never'}
                                        </span>
                                    </div>
                                    <code className='hidden rounded bg-muted px-2 py-1 font-mono text-xs sm:block'>
                                        {key.identifier}
                                    </code>
                                    <ConfirmDeleteButton
                                        title='Delete API key'
                                        description={`All requests using the ${key.identifier} key will be invalidated.`}
                                        label={`Delete ${key.description}`}
                                        disabled={remove.isPending}
                                        onConfirm={() => remove.mutate(key.identifier)}
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
                                        <EmptyTitle>No API keys</EmptyTitle>
                                        <EmptyDescription>No API keys exist for this account.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
            <Dialog open={!!createdToken} onOpenChange={(open) => !open && setCreatedToken(null)}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Your API key</DialogTitle>
                        <DialogDescription>
                            The API key you requested is shown below. Store it somewhere safe, it will not be shown again.
                        </DialogDescription>
                    </DialogHeader>
                    <code className='rounded-lg bg-muted p-3 font-mono text-sm break-all select-all'>{createdToken}</code>
                    <DialogFooter>
                        <Button variant='outline' onClick={handleCopy}>
                            Copy
                        </Button>
                        <Button onClick={() => setCreatedToken(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export { AccountApiPage };
