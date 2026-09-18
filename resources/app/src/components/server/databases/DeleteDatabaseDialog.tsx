import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteServerDatabase, type ServerDatabase, serverDatabasesKey } from '@/api/server/databases';
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';

const DeleteDatabaseDialog: React.FC<{
    database: ServerDatabase;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}> = ({ database, isOpen, onOpenChange }) => {
    const { server } = useServer();
    const queryClient = useQueryClient();
    const [confirmation, setConfirmation] = useState('');

    const remove = useMutation({
        mutationFn: () => deleteServerDatabase(server.uuid, database.id),
        onSuccess: () => {
            toast.success(`Database ${database.name} has been deleted.`);
            queryClient.invalidateQueries({ queryKey: serverDatabasesKey(server.uuid) });
            handleOpenChange(false);
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setConfirmation('');
            remove.reset();
        }

        onOpenChange(open);
    };

    const acceptedNames = [database.name.split('_', 2)[1], database.name];
    const isConfirmed = confirmation.length > 0 && acceptedNames.includes(confirmation);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isConfirmed) {
            return;
        }

        remove.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={handleSubmit} className='contents'>
                    <DialogHeader>
                        <DialogTitle>Confirm database deletion</DialogTitle>
                        <DialogDescription>
                            Deleting a database is a permanent action, it cannot be undone. This will permanently delete
                            the <strong className='text-foreground'>{database.name}</strong> database and remove all
                            associated data.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup>
                        <FormError message={remove.error ? httpErrorToHuman(remove.error) : null} />
                        <Field>
                            <FieldLabel htmlFor={`database-${database.id}-confirm`}>Confirm database name</FieldLabel>
                            <Input
                                id={`database-${database.id}-confirm`}
                                autoComplete='off'
                                value={confirmation}
                                onChange={(event) => setConfirmation(event.target.value)}
                            />
                            <FieldDescription>Enter the database name to confirm deletion.</FieldDescription>
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type='submit' variant='destructive' disabled={!isConfirmed || remove.isPending}>
                            {remove.isPending && <Spinner />}
                            Delete database
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export { DeleteDatabaseDialog };
