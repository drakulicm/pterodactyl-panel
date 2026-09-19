import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ArchiveIcon, LockIcon } from 'lucide-react';

import { type ServerBackup, serverBackupsKey } from '@/api/server/backups';
import { BackupActions } from '@/components/server/backups/BackupActions';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { bytesToString } from '@/lib/format';
import { SocketEvent } from '@/lib/socketEvents';

const BackupRow: React.FC<{
    backup: ServerBackup;
}> = ({ backup }) => {
    const { server } = useServer();
    const queryClient = useQueryClient();
    const isCompleted = backup.completedAt !== null;

    useSocketEvent(`${SocketEvent.BACKUP_COMPLETED}:${backup.uuid}`, () => {
        queryClient.invalidateQueries({ queryKey: serverBackupsKey(server.uuid) });
    });

    return (
        <div className='flex flex-wrap items-center gap-3 rounded-lg border p-3 md:flex-nowrap'>
            <div className='flex size-4 shrink-0 items-center justify-center'>
                {!isCompleted ? (
                    <Spinner />
                ) : backup.isLocked ? (
                    <LockIcon className='size-4 text-warning' />
                ) : (
                    <ArchiveIcon className='size-4 text-muted-foreground' />
                )}
            </div>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <div className='flex min-w-0 items-center gap-2'>
                    {isCompleted && !backup.isSuccessful && <Badge variant='destructive'>Failed</Badge>}
                    {!isCompleted && <Badge variant='secondary'>In progress</Badge>}
                    <span className='truncate text-sm font-medium'>{backup.name}</span>
                    {isCompleted && backup.isSuccessful && (
                        <span className='shrink-0 text-xs text-muted-foreground'>{bytesToString(backup.bytes)}</span>
                    )}
                </div>
                {backup.checksum && (
                    <span className='truncate font-mono text-xs text-muted-foreground'>{backup.checksum}</span>
                )}
            </div>
            <div className='flex shrink-0 flex-col md:w-40 md:text-right'>
                <span className='text-sm' title={format(backup.createdAt, 'EEE, MMMM do, yyyy HH:mm:ss')}>
                    {formatDistanceToNow(backup.createdAt, { includeSeconds: true, addSuffix: true })}
                </span>
                <span className='text-xs text-muted-foreground'>Created</span>
            </div>
            <div className='flex size-7 shrink-0 items-center justify-center'>
                {isCompleted && <BackupActions backup={backup} />}
            </div>
        </div>
    );
};

export { BackupRow };
