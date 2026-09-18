import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NetworkIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { createServerAllocation, serverAllocationsQueryOptions } from '@/api/server/network';
import { serverQueryOptions } from '@/api/server/server';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { AllocationRow } from '@/components/server/network/AllocationRow';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const ServerNetworkPage: React.FC = () => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();
    const { data, error, isPending } = useQuery({
        ...serverAllocationsQueryOptions(server.uuid),
        initialData: server.allocations,
        initialDataUpdatedAt: 0,
    });

    const allocationLimit = server.featureLimits.allocations;
    const canCreate = hasPermission(permissions, 'allocation.create') && allocationLimit > 0;

    const create = useMutation({
        mutationFn: () => createServerAllocation(server.uuid),
        onSuccess: () => {
            toast.success('Allocation created.');
            queryClient.invalidateQueries({ queryKey: serverAllocationsQueryOptions(server.uuid).queryKey });
            queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
        },
        onError: (mutationError) => toast.error(httpErrorToHuman(mutationError)),
    });

    return (
        <>
            <PageHeader title='Network'>
                {canCreate && (
                    <span className='hidden text-sm text-muted-foreground sm:inline'>
                        {data.length} of {allocationLimit} allocations
                    </span>
                )}
                {canCreate && allocationLimit > data.length && (
                    <Button size='sm' disabled={create.isPending} onClick={() => create.mutate()}>
                        {create.isPending ? <Spinner /> : <PlusIcon />}
                        Create allocation
                    </Button>
                )}
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <FormError message={error ? httpErrorToHuman(error) : null} />
                {isPending ? (
                    <Skeleton className='h-24 rounded-xl' />
                ) : data.length ? (
                    <div className='flex flex-col gap-2'>
                        {data.map((allocation) => (
                            <AllocationRow key={allocation.id} allocation={allocation} />
                        ))}
                    </div>
                ) : (
                    <Empty className='border'>
                        <EmptyHeader>
                            <EmptyMedia variant='icon'>
                                <NetworkIcon />
                            </EmptyMedia>
                            <EmptyTitle>No allocations</EmptyTitle>
                            <EmptyDescription>This server has no allocations assigned to it.</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
                {canCreate && (
                    <p className='text-sm text-muted-foreground sm:hidden'>
                        You are currently using {data.length} of {allocationLimit} allowed allocations for this server.
                    </p>
                )}
            </div>
        </>
    );
};

export { ServerNetworkPage };
