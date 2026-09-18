import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { serverQueryOptions } from '@/api/server/server';
import { renameServer } from '@/api/server/settings';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    name: z.string().min(1, 'A server name is required.').max(191, 'The server name cannot exceed 191 characters.'),
    description: z.string(),
});

const RenameServerCard: React.FC = () => {
    const { server } = useServer();
    const queryClient = useQueryClient();
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { name: server.name, description: server.description ?? '' },
    });

    const rename = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => renameServer(server.uuid, values),
        onSuccess: (_, values) => {
            toast.success('Server details updated.');
            form.reset(values);
            queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
            queryClient.invalidateQueries({ queryKey: ['servers'] });
        },
    });

    const handleSubmit = form.handleSubmit((values) => rename.mutate(values));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Change server details</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} noValidate>
                    <FieldGroup>
                        <FormError message={rename.error ? httpErrorToHuman(rename.error) : null} />
                        <Field data-invalid={!!form.formState.errors.name}>
                            <FieldLabel htmlFor='server-name'>Server name</FieldLabel>
                            <Input
                                id='server-name'
                                aria-invalid={!!form.formState.errors.name}
                                {...form.register('name')}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor='server-description'>Server description</FieldLabel>
                            <Textarea id='server-description' rows={3} {...form.register('description')} />
                        </Field>
                        <Button type='submit' className='self-end' disabled={rename.isPending}>
                            {rename.isPending && <Spinner />}
                            Save
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
};

export { RenameServerCard };
