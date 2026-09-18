import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArchiveRestoreIcon,
    CloudDownloadIcon,
    EllipsisIcon,
    LockIcon,
    LockOpenIcon,
    Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    deleteServerBackup,
    getServerBackupDownloadUrl,
    restoreServerBackup,
    type ServerBackup,
    serverBackupsKey,
    toggleServerBackupLock,
} from '@/api/server/backups';
import { serverQueryOptions } from '@/api/server/server';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

type BackupModal = 'unlock' | 'restore' | 'delete' | null;

const BackupActions: React.FC<{
    backup: ServerBackup;
}> = ({ backup }) => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();
    const [modal, setModal] = useState<BackupModal>(null);
    const [isTruncating, setIsTruncating] = useState(false);

    const canDownload = hasPermission(permissions, 'backup.download');
    const canRestore = hasPermission(permissions, 'backup.restore');
    const canDelete = hasPermission(permissions, 'backup.delete');

    const invalidateBackups = () => queryClient.invalidateQueries({ queryKey: serverBackupsKey(server.uuid) });

    const download = useMutation({
        mutationFn: () => getServerBackupDownloadUrl(server.uuid, backup.uuid),
        onSuccess: (url) => window.location.assign(url),
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const remove = useMutation({
        mutationFn: () => deleteServerBackup(server.uuid, backup.uuid),
        onSuccess: () => {
            toast.success('Backup deleted.');
            invalidateBackups();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
        onSettled: () => setModal(null),
    });

    const restore = useMutation({
        mutationFn: () => restoreServerBackup(server.uuid, backup.uuid, isTruncating),
        onSuccess: () => {
            toast.success('Backup restoration started.');
            queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
        onSettled: () => setModal(null),
    });

    const toggleLock = useMutation({
        mutationFn: () => toggleServerBackupLock(server.uuid, backup.uuid),
        onSuccess: (updated) => {
            toast.success(updated.isLocked ? 'Backup locked.' : 'Backup unlocked.');
            invalidateBackups();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
        onSettled: () => setModal(null),
    });

    const handleLockToggle = () => {
        if (backup.isLocked) {
            setModal('unlock');
            return;
        }

        toggleLock.mutate();
    };

    const handleModalOpenChange = (open: boolean) => {
        if (!open) {
            setModal(null);
        }
    };

    const isBusy = download.isPending || remove.isPending || restore.isPending || toggleLock.isPending;

    if (!canDownload && !canRestore && !canDelete) {
        return null;
    }

    return (
        <>
            {backup.isSuccessful ? (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant='ghost'
                                size='icon-sm'
                                aria-label={`Actions for ${backup.name}`}
                                disabled={isBusy}
                            />
                        }
                    >
                        {isBusy ? <Spinner /> : <EllipsisIcon />}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-40'>
                        {canDownload && (
                            <DropdownMenuItem onClick={() => download.mutate()}>
                                <CloudDownloadIcon />
                                Download
                            </DropdownMenuItem>
                        )}
                        {canRestore && (
                            <DropdownMenuItem onClick={() => setModal('restore')}>
                                <ArchiveRestoreIcon />
                                Restore
                            </DropdownMenuItem>
                        )}
                        {canDelete && (
                            <DropdownMenuItem onClick={handleLockToggle}>
                                {backup.isLocked ? <LockOpenIcon /> : <LockIcon />}
                                {backup.isLocked ? 'Unlock' : 'Lock'}
                            </DropdownMenuItem>
                        )}
                        {canDelete && !backup.isLocked && (
                            <DropdownMenuItem variant='destructive' onClick={() => setModal('delete')}>
                                <Trash2Icon />
                                Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                canDelete && (
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label={`Delete ${backup.name}`}
                        disabled={isBusy}
                        onClick={() => setModal('delete')}
                    >
                        {isBusy ? <Spinner /> : <Trash2Icon />}
                    </Button>
                )
            )}
            <AlertDialog open={modal === 'unlock'} onOpenChange={handleModalOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unlock &quot;{backup.name}&quot;</AlertDialogTitle>
                        <AlertDialogDescription>
                            This backup will no longer be protected from automated or accidental deletions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction disabled={toggleLock.isPending} onClick={() => toggleLock.mutate()}>
                            Unlock
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={modal === 'restore'} onOpenChange={handleModalOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restore &quot;{backup.name}&quot;</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your server will be stopped. You will not be able to control the power state, access the
                            file manager, or create additional backups until completed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='flex items-center gap-3 rounded-lg border bg-muted/50 p-3'>
                        <Checkbox
                            id={`restore-truncate-${backup.uuid}`}
                            checked={isTruncating}
                            onCheckedChange={(checked) => setIsTruncating(checked)}
                        />
                        <Label htmlFor={`restore-truncate-${backup.uuid}`}>
                            Delete all files before restoring backup.
                        </Label>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            disabled={restore.isPending}
                            onClick={() => restore.mutate()}
                        >
                            Restore
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={modal === 'delete'} onOpenChange={handleModalOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &quot;{backup.name}&quot;</AlertDialogTitle>
                        <AlertDialogDescription>
                            This is a permanent operation. The backup cannot be recovered once deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            disabled={remove.isPending}
                            onClick={() => remove.mutate()}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export { BackupActions };
