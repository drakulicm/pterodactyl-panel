import { useQuery } from '@tanstack/react-query';
import { DatabaseIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { serverDatabasesQueryOptions } from '@/api/server/databases';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateDatabaseDialog } from '@/components/server/databases/CreateDatabaseDialog';
import { DatabaseRow } from '@/components/server/databases/DatabaseRow';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const ServerDatabasesPage: React.FC = () => {
    const { server, permissions } = useServer();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const databases = useQuery(
        serverDatabasesQueryOptions(server.uuid, hasPermission(permissions, 'database.view_password')),
    );

    const databaseLimit = server.featureLimits.databases;
    const databaseCount = databases.data?.length ?? 0;
    const canCreate =
        hasPermission(permissions, 'database.create') &&
        databases.isSuccess &&
        databaseLimit > 0 &&
        databaseCount < databaseLimit;

    return (
        <>
            <PageHeader title='Databases'>
                {hasPermission(permissions, 'database.create') && databaseLimit > 0 && databases.isSuccess && (
                    <span className='hidden text-xs text-muted-foreground sm:inline'>
                        {databaseCount} of {databaseLimit} used
                    </span>
                )}
                {canCreate && (
                    <Button size='sm' onClick={() => setIsCreateOpen(true)}>
                        <PlusIcon />
                        New database
                    </Button>
                )}
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={databases.error ? httpErrorToHuman(databases.error) : null} />
                {databases.isPending ? (
                    <Skeleton className='h-24' />
                ) : databases.data?.length ? (
                    <div className='flex flex-col gap-2'>
                        {databases.data.map((database) => (
                            <DatabaseRow key={database.id} database={database} />
                        ))}
                    </div>
                ) : (
                    !databases.error && (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant='icon'>
                                    <DatabaseIcon />
                                </EmptyMedia>
                                <EmptyTitle>No databases</EmptyTitle>
                                <EmptyDescription>
                                    {databaseLimit > 0
                                        ? 'It looks like you have no databases.'
                                        : 'Databases cannot be created for this server.'}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                )}
            </div>
            <CreateDatabaseDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </>
    );
};

export { ServerDatabasesPage };
