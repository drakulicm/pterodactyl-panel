import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { type AdminServer, type AdminServerUser, updateServerDetails } from '@/admin/api/servers';
import { OwnerPicker } from '@/admin/components/servers/OwnerPicker';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    name: z.string().min(1, 'A server name is required.').max(191, 'The server name may not exceed 191 characters.'),
    externalId: z.string().max(191, 'The external identifier may not exceed 191 characters.'),
    ownerId: z.number().int().positive('A server owner must be selected.'),
    description: z.string(),
});

type FormValues = z.infer<typeof schema>;

const ServerDetailsTab: React.FC<{ server: AdminServer }> = ({ server }) => {
    const queryClient = useQueryClient();
    const user = server.relationships?.user?.attributes;
    const ownerRef = useRef<AdminServerUser | null>(user ?? null);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            name: server.name,
            externalId: server.external_id ?? '',
            ownerId: server.user,
            description: server.description ?? '',
        },
    });
    const { errors } = form.formState;
    const ownerId = form.watch('ownerId');

    const update = useMutation({
        mutationFn: (values: FormValues) =>
            updateServerDetails(server.id, {
                name: values.name,
                user: values.ownerId,
                external_id: values.externalId.trim() || null,
                description: values.description || null,
            }),
        onSuccess: async () => {
            toast.success('Server details have been updated.');
            await queryClient.invalidateQueries({ queryKey: ['admin', `/servers/${server.id}`] });
            await queryClient.invalidateQueries({ queryKey: ['admin', '/servers'] });
        },
    });

    const handleSubmit = form.handleSubmit((values) => update.mutate(values));

    return (
        <form onSubmit={handleSubmit} noValidate>
            <Card>
                <CardHeader>
                    <CardTitle>Base information</CardTitle>
                </CardHeader>
                <CardContent className='flex flex-col gap-6'>
                    <FormError message={update.error ? httpErrorToHuman(update.error) : null} />
                    <Field data-invalid={!!errors.name}>
                        <FieldLabel htmlFor='details-name'>Server name</FieldLabel>
                        <Input id='details-name' aria-invalid={!!errors.name} {...form.register('name')} />
                        <FieldDescription>
                            Character limits: <code className='font-mono'>a-zA-Z0-9_-</code> and{' '}
                            <code className='font-mono'>[Space]</code>.
                        </FieldDescription>
                        <FieldError errors={[errors.name]} />
                    </Field>
                    <Field data-invalid={!!errors.externalId}>
                        <FieldLabel htmlFor='details-external-id'>External identifier</FieldLabel>
                        <Input
                            id='details-external-id'
                            aria-invalid={!!errors.externalId}
                            {...form.register('externalId')}
                        />
                        <FieldDescription>
                            Leave empty to not assign an external identifier for this server. The external ID should be
                            unique to this server and not be in use by any other servers.
                        </FieldDescription>
                        <FieldError errors={[errors.externalId]} />
                    </Field>
                    <Field data-invalid={!!errors.ownerId}>
                        <FieldLabel>Server owner</FieldLabel>
                        <OwnerPicker
                            value={ownerId}
                            selectedLabel={ownerRef.current?.email ?? null}
                            onChange={(nextUser) => {
                                ownerRef.current = nextUser;
                                form.setValue('ownerId', nextUser.id, { shouldValidate: true });
                            }}
                        />
                        <FieldDescription>
                            You can change the owner of this server by changing this field to an email matching another
                            user on this system. If you do this a new daemon security token will be generated
                            automatically.
                        </FieldDescription>
                        <FieldError errors={[errors.ownerId]} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='details-description'>Server description</FieldLabel>
                        <Textarea id='details-description' rows={3} {...form.register('description')} />
                        <FieldDescription>A brief description of this server.</FieldDescription>
                    </Field>
                </CardContent>
                <CardFooter className='justify-end'>
                    <Button type='submit' disabled={update.isPending}>
                        {update.isPending && <Spinner />}
                        Update details
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
};

export { ServerDetailsTab };
