import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { serverQueryOptions } from '@/api/server/server';
import { reinstallServer } from '@/api/server/settings';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';

const ReinstallServerCard: React.FC = () => {
    const { server } = useServer();
    const queryClient = useQueryClient();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const reinstall = useMutation({
        mutationFn: () => reinstallServer(server.uuid),
        onSuccess: () => {
            toast.success('Your server has begun the reinstallation process.');
            queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
        onSettled: () => setIsConfirmOpen(false),
    });

    if (server.skipScripts) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reinstall server</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
                <p className='text-sm text-muted-foreground'>
                    Reinstalling your server will stop it, and then re-run the installation script that initially set
                    it up.{' '}
                    <strong className='font-medium text-foreground'>
                        Some files may be deleted or modified during this process, please back up your data before
                        continuing.
                    </strong>
                </p>
                <Button
                    variant='destructive'
                    className='self-end'
                    disabled={reinstall.isPending}
                    onClick={() => setIsConfirmOpen(true)}
                >
                    {reinstall.isPending && <Spinner />}
                    Reinstall server
                </Button>
            </CardContent>
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm server reinstallation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your server will be stopped and some files may be deleted or modified during this process,
                            are you sure you wish to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            disabled={reinstall.isPending}
                            onClick={() => reinstall.mutate()}
                        >
                            Yes, reinstall server
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

export { ReinstallServerCard };
