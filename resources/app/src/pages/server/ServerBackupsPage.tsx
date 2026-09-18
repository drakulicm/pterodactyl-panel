import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveIcon } from 'lucide-react';
import { useState } from 'react';

import { serverBackupsKey, serverBackupsQueryOptions } from '@/api/server/backups';
import { FormError } from '@/components/auth/FormError';
import { ListPagination } from '@/components/layout/ListPagination';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackupRow } from '@/components/server/backups/BackupRow';
import { CreateBackupDialog } from '@/components/server/backups/CreateBackupDialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useServer } from '@/hooks/useServer';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';
import { SocketEvent } from '@/lib/socketEvents';

const ServerBackupsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { server, permissions } = useServer();
    const [page, setPage] = useState(1);
    const { data, error, isPending } = useQuery(serverBackupsQueryOptions(server.uuid, page));

    const backupLimit = server.featureLimits.backups;
    const backupCount = data?.backupCount ?? 0;
    const canCreate = hasPermission(permissions, 'backup.create') && !!data && backupLimit > backupCount;

    const getEmptyDescription = (): string => {
        if (backupLimit === 0) {
            return 'Backups cannot be created for this server because the backup limit is set to 0.';
        }

        if (page > 1) {
            return "Looks like we've run out of backups to show you, try going back a page.";
        }

        return 'It looks like there are no backups currently stored for this server.';
    };

    useSocketEvent(SocketEvent.BACKUP_COMPLETED, () => {
        queryClient.invalidateQueries({ queryKey: serverBackupsKey(server.uuid) });
    });

    return (
        <>
            <PageHeader title='Backups'>
                {backupLimit > 0 && data && (
                    <span className='hidden text-sm text-muted-foreground sm:inline'>
                        {backupCount} of {backupLimit} backups
                    </span>
                )}
                {canCreate && <CreateBackupDialog />}
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={error ? httpErrorToHuman(error) : null} />
                {isPending ? (
                    <Skeleton className='h-40 rounded-xl' />
                ) : data?.items.length ? (
                    <div className='flex flex-col gap-2'>
                        {data.items.map((backup) => (
                            <BackupRow key={backup.uuid} backup={backup} />
                        ))}
                    </div>
                ) : (
                    !error && (
                        <Empty className='border'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon'>
                                    <ArchiveIcon />
                                </EmptyMedia>
                                <EmptyTitle>No backups</EmptyTitle>
                                <EmptyDescription>{getEmptyDescription()}</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                )}
                {backupLimit > 0 && data && (
                    <p className='text-sm text-muted-foreground sm:hidden'>
                        {backupCount} of {backupLimit} backups have been created for this server.
                    </p>
                )}
                {data && <ListPagination pagination={data.pagination} onPageChange={setPage} />}
            </div>
        </>
    );
};

export { ServerBackupsPage };
