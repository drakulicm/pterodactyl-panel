import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createServerDatabase, serverDatabasesKey } from '@/api/server/databases';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';

const schema = z.object({
    databaseName: z
        .string()
        .min(3, 'Database name must be at least 3 characters.')
        .max(48, 'Database name must not exceed 48 characters.')
        .regex(
            /^[\w\-.]{3,48}$/,
            'Database name should only contain alphanumeric characters, underscores, dashes, and/or periods.',
        ),
    connectionsFrom: z
        .string()
        .refine((value) => value === '' || /^[\w\-/.%:]+$/.test(value), 'A valid host address must be provided.'),
});

const CreateDatabaseDialog: React.FC<{
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}> = ({ isOpen, onOpenChange }) => {
    const { server } = useServer();
    const queryClient = useQueryClient();
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: { databaseName: '', connectionsFrom: '' },
    });

    const create = useMutation({
        mutationFn: (values: z.infer<typeof schema>) => createServerDatabase(server.uuid, values),
        onSuccess: (database) => {
            toast.success(`Database ${database.name} has been created.`);
            queryClient.invalidateQueries({ queryKey: serverDatabasesKey(server.uuid) });
            handleOpenChange(false);
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            form.reset();
            create.reset();
        }

        onOpenChange(open);
    };

    const handleSubmit = form.handleSubmit((values) => create.mutate(values));

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={handleSubmit} noValidate className='contents'>
                    <DialogHeader>
                        <DialogTitle>Create new database</DialogTitle>
                        <DialogDescription>A new MySQL database will be provisioned for this server.</DialogDescription>
                    </DialogHeader>
                    <FieldGroup>
                        <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                        <Field data-invalid={!!form.formState.errors.databaseName}>
                            <FieldLabel htmlFor='database-name'>Database name</FieldLabel>
                            <Input
                                id='database-name'
                                autoFocus
                                aria-invalid={!!form.formState.errors.databaseName}
                                {...form.register('databaseName')}
                            />
                            <FieldDescription>A descriptive name for your database instance.</FieldDescription>
                            <FieldError errors={[form.formState.errors.databaseName]} />
                        </Field>
                        <Field data-invalid={!!form.formState.errors.connectionsFrom}>
                            <FieldLabel htmlFor='database-connections-from'>Connections from</FieldLabel>
                            <Input
                                id='database-connections-from'
                                placeholder='%'
                                aria-invalid={!!form.formState.errors.connectionsFrom}
                                {...form.register('connectionsFrom')}
                            />
                            <FieldDescription>
                                Where connections should be allowed from. Leave blank to allow connections from
                                anywhere.
                            </FieldDescription>
                            <FieldError errors={[form.formState.errors.connectionsFrom]} />
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type='submit' disabled={create.isPending}>
                            {create.isPending && <Spinner />}
                            Create database
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { CreateDatabaseDialog };
