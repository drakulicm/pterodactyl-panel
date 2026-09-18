import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { type AdminServer, deleteServer } from '@/admin/api/servers';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';

const DeleteCard: React.FC<{
    server: AdminServer;
    isForced: boolean;
    title: string;
    description: string;
    warning: string;
    label: string;
    onDeleted: () => void;
}> = ({ server, isForced, title, description, warning, label, onDeleted }) => {
    const [confirmation, setConfirmation] = useState('');

    const remove = useMutation({
        mutationFn: () => deleteServer(server.id, isForced),
        onSuccess: () => {
            toast.success(`${server.name} has been deleted.`);
            onDeleted();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
                <p className='text-sm text-destructive'>{warning}</p>
                <Field>
                    <FieldLabel htmlFor={`delete-confirm-${isForced ? 'force' : 'safe'}`}>
                        Type the server name to confirm
                    </FieldLabel>
                    <Input
                        id={`delete-confirm-${isForced ? 'force' : 'safe'}`}
                        value={confirmation}
                        placeholder={server.name}
                        onChange={(event) => setConfirmation(event.target.value)}
                    />
                    <FieldDescription>
                        Enter <code className='font-mono'>{server.name}</code> to enable this button.
                    </FieldDescription>
                </Field>
            </CardContent>
            <CardFooter>
                <AlertDialog>
                    <AlertDialogTrigger
                        render={
                            <Button
                                variant='destructive'
                                disabled={confirmation !== server.name || remove.isPending}
                            />
                        }
                    >
                        {remove.isPending && <Spinner />}
                        {label}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {server.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure that you want to delete this server? There is no going back, all data will
                                immediately be removed.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction variant='destructive' onClick={() => remove.mutate()}>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
};

const ServerDeleteTab: React.FC<{ server: AdminServer }> = ({ server }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleDeleted = async () => {
        await queryClient.invalidateQueries({ queryKey: ['admin', '/servers'] });
        await navigate({ to: '/admin/servers' });
    };

    return (
        <div className='grid gap-4 md:grid-cols-2'>
            <DeleteCard
                server={server}
                isForced={false}
                title='Safely delete server'
                description='This action will attempt to delete the server from both the panel and daemon. If either one reports an error the action will be cancelled.'
                warning='Deleting a server is an irreversible action. All server data (including files and users) will be removed from the system.'
                label='Safely delete this server'
                onDeleted={handleDeleted}
            />
            <DeleteCard
                server={server}
                isForced
                title='Force delete server'
                description='This action will attempt to delete the server from both the panel and daemon. If the daemon does not respond, or reports an error the deletion will continue.'
                warning='Deleting a server is an irreversible action. All server data (including files and users) will be removed from the system. This method may leave dangling files on your daemon if it reports an error.'
                label='Forcibly delete this server'
                onDeleted={handleDeleted}
            />
        </div>
    );
};

export { ServerDeleteTab };
