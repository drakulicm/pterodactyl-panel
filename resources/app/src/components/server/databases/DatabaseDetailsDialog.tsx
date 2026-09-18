import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { rotateServerDatabasePassword, type ServerDatabase, serverDatabasesKey } from '@/api/server/databases';
import { FormError } from '@/components/auth/FormError';
import { CopyField } from '@/components/server/databases/CopyField';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const DatabaseDetailsDialog: React.FC<{
    database: ServerDatabase;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}> = ({ database, isOpen, onOpenChange }) => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();
    const canViewPassword = hasPermission(permissions, 'database.view_password');
    const canUpdate = hasPermission(permissions, 'database.update');

    const rotate = useMutation({
        mutationFn: () => rotateServerDatabasePassword(server.uuid, database.id),
        onSuccess: () => {
            toast.success('The database password has been rotated.');
            queryClient.invalidateQueries({ queryKey: serverDatabasesKey(server.uuid) });
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            rotate.reset();
        }

        onOpenChange(open);
    };

    const jdbcConnectionString = `jdbc:mysql://${database.username}${
        database.password ? `:${encodeURIComponent(database.password)}` : ''
    }@${database.connectionString}/${database.name}`;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle>Database connection details</DialogTitle>
                    <DialogDescription>{database.name}</DialogDescription>
                </DialogHeader>
                <FieldGroup>
                    <FormError message={rotate.error ? httpErrorToHuman(rotate.error) : null} />
                    <CopyField
                        id={`database-${database.id}-endpoint`}
                        label='Endpoint'
                        value={database.connectionString}
                    />
                    <CopyField
                        id={`database-${database.id}-connections`}
                        label='Connections from'
                        value={database.allowConnectionsFrom}
                        canCopy={false}
                    />
                    <CopyField id={`database-${database.id}-username`} label='Username' value={database.username} />
                    {canViewPassword && (
                        <CopyField
                            id={`database-${database.id}-password`}
                            label='Password'
                            value={database.password ?? ''}
                            isSecret
                        />
                    )}
                    <CopyField
                        id={`database-${database.id}-jdbc`}
                        label='JDBC connection string'
                        value={jdbcConnectionString}
                        isSecret={!!database.password}
                    />
                </FieldGroup>
                <DialogFooter>
                    {canUpdate && (
                        <Button variant='outline' disabled={rotate.isPending} onClick={() => rotate.mutate()}>
                            {rotate.isPending && <Spinner />}
                            Rotate password
                        </Button>
                    )}
                    <Button onClick={() => handleOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export { DatabaseDetailsDialog };
