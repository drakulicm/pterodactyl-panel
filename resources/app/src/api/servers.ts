import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { type Raw, toServer } from '@/api/server/transformers';
import type { Server, ServerPlayers, ServerStats } from '@/api/server/types';
import { getPaginationSet, http, type PaginatedResult } from '@/lib/http';

type ServerListType = 'owner' | 'admin';

const getServers = async (params: {
    query?: string;
    page?: number;
    type?: ServerListType;
}): Promise<PaginatedResult<Server>> => {
    const { data } = await http.get('/api/client', {
        params: { 'filter[*]': params.query || undefined, page: params.page, type: params.type },
    });

    return {
        items: ((data.data ?? []) as Raw[]).map(toServer),
        pagination: getPaginationSet(data.meta.pagination),
    };
};

const getServerResourceUsage = async (server: string): Promise<ServerStats> => {
    const { data } = await http.get(`/api/client/servers/${server}/resources`);
    const { attributes } = data;

    return {
        status: attributes.current_state,
        isSuspended: attributes.is_suspended,
        memoryUsageInBytes: attributes.resources.memory_bytes,
        cpuUsagePercent: attributes.resources.cpu_absolute,
        diskUsageInBytes: attributes.resources.disk_bytes,
        networkRxInBytes: attributes.resources.network_rx_bytes,
        networkTxInBytes: attributes.resources.network_tx_bytes,
        uptime: attributes.resources.uptime,
    };
};

const getServerPlayerCount = async (server: string): Promise<ServerPlayers> => {
    const { data } = await http.get(`/api/client/servers/${server}/players`);
    const { attributes } = data;

    return {
        isOnline: attributes.is_online,
        players: attributes.players,
        maxPlayers: attributes.max_players,
    };
};

const serversQueryOptions = (params: { query?: string; page?: number; type?: ServerListType }) =>
    queryOptions({
        queryKey: ['servers', params],
        queryFn: () => getServers(params),
        placeholderData: keepPreviousData,
    });

const serverResourcesQueryOptions = (server: string, enabled: boolean) =>
    queryOptions({
        queryKey: ['server', server, 'resources'],
        queryFn: () => getServerResourceUsage(server),
        enabled,
        refetchInterval: 30000,
        retry: false,
    });

const serverPlayerCountQueryOptions = (server: string, enabled: boolean) =>
    queryOptions({
        queryKey: ['server', server, 'players'],
        queryFn: () => getServerPlayerCount(server),
        enabled,
        refetchInterval: 15000,
        retry: false,
    });

export { serverPlayerCountQueryOptions, serverResourcesQueryOptions, serversQueryOptions };
export type { ServerListType };
