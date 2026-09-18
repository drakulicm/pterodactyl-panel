import { queryOptions } from '@tanstack/react-query';

import { type Raw, toAllocation } from '@/api/server/transformers';
import type { Allocation } from '@/api/server/types';
import { http } from '@/lib/http';

const getServerAllocations = async (uuid: string): Promise<Allocation[]> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/network/allocations`);

    return ((data.data ?? []) as Raw[]).map(toAllocation);
};

const serverAllocationsQueryOptions = (uuid: string) =>
    queryOptions({
        queryKey: ['server', uuid, 'allocations'],
        queryFn: () => getServerAllocations(uuid),
    });

const createServerAllocation = async (uuid: string): Promise<Allocation> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/network/allocations`);

    return toAllocation(data as Raw);
};

const deleteServerAllocation = async (uuid: string, id: number): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/network/allocations/${id}`);
};

const setPrimaryServerAllocation = async (uuid: string, id: number): Promise<Allocation> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/network/allocations/${id}/primary`);

    return toAllocation(data as Raw);
};

const setServerAllocationNotes = async (uuid: string, id: number, notes: string | null): Promise<Allocation> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/network/allocations/${id}`, { notes });

    return toAllocation(data as Raw);
};

export {
    createServerAllocation,
    deleteServerAllocation,
    serverAllocationsQueryOptions,
    setPrimaryServerAllocation,
    setServerAllocationNotes,
};
