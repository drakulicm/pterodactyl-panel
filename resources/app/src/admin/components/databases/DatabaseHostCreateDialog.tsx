import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createDatabaseHost } from '@/admin/api/databases';
import {
    databaseHostSchema,
    DatabaseHostFields,
    type DatabaseHostFormValues,
    NO_NODE,
    toDatabaseHostBody,
} from '@/admin/components/databases/DatabaseHostFields';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const DEFAULTS: DatabaseHostFormValues = {
    name: '',
    host: '',
    port: '3306',
    username: '',
    password: '',
    nodeId: NO_NODE,
};

const DatabaseHostCreateDialog: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<DatabaseHostFormValues>({
        resolver: zodResolver(databaseHostSchema),
        defaultValues: DEFAULTS,
    });

    const create = useMutation({
        mutationFn: (values: DatabaseHostFormValues) => createDatabaseHost(toDatabaseHostBody(values)),
        onSuccess: async (host) => {
            await queryClient.invalidateQueries({ queryKey: ['admin', '/database-hosts'] });
            setIsOpen(false);
            form.reset(DEFAULTS);
            toast.success(`${host.name} has been created.`);
            await navigate({ to: '/admin/databases/view/$hostId', params: { hostId: String(host.id) } });
        },
    });

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);

        if (!open) {
            form.reset(DEFAULTS);
            create.reset();
        }
    };

    const handleSubmit = form.handleSubmit((values) => create.mutate(values));

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button size='sm' />}>
                <PlusIcon />
                Create new
            </DialogTrigger>
            <DialogContent className='sm:max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>Create database host</DialogTitle>
                    <DialogDescription>
                        The account defined for this database host must have the{' '}
                        <code className='font-mono text-xs'>WITH GRANT OPTION</code> permission. Do not use the same
                        account details for MySQL that you have defined for this panel.
                    </DialogDescription>
                </DialogHeader>
                <form id='database-host-create-form' onSubmit={handleSubmit} noValidate>
                    <FieldGroup>
                        <FormError message={create.error ? httpErrorToHuman(create.error) : null} />
                        <DatabaseHostFields form={form} idPrefix='host-create' />
                    </FieldGroup>
                </form>
                <DialogFooter>
                    <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type='submit' form='database-host-create-form' disabled={create.isPending}>
                        {create.isPending && <Spinner />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export { DatabaseHostCreateDialog };
