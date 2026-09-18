import { useQuery } from '@tanstack/react-query';
import { UserPlusIcon, UsersIcon } from 'lucide-react';
import { useState } from 'react';

import { serverSubusersQueryOptions } from '@/api/server/subusers';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { EditSubuserDialog } from '@/components/server/users/EditSubuserDialog';
import { UserRow } from '@/components/server/users/UserRow';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const ServerUsersPage: React.FC = () => {
    const { server, permissions } = useServer();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const subusers = useQuery(serverSubusersQueryOptions(server.uuid));
    const canCreate = hasPermission(permissions, 'user.create');

    return (
        <>
            <PageHeader title='Users'>
                {canCreate && (
                    <Button size='sm' onClick={() => setIsInviteOpen(true)}>
                        <UserPlusIcon />
                        New user
                    </Button>
                )}
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={subusers.error ? httpErrorToHuman(subusers.error) : null} />
                {subusers.isPending ? (
                    <Skeleton className='h-24' />
                ) : subusers.data?.length ? (
                    <div className='flex flex-col gap-2'>
                        {subusers.data.map((subuser) => (
                            <UserRow key={subuser.uuid} subuser={subuser} />
                        ))}
                    </div>
                ) : (
                    !subusers.error && (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant='icon'>
                                    <UsersIcon />
                                </EmptyMedia>
                                <EmptyTitle>No subusers</EmptyTitle>
                                <EmptyDescription>It looks like you don&apos;t have any subusers.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                )}
            </div>
            {canCreate && <EditSubuserDialog isOpen={isInviteOpen} onOpenChange={setIsInviteOpen} />}
        </>
    );
};

export { ServerUsersPage };
