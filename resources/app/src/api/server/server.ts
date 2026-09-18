import { queryOptions } from '@tanstack/react-query';

import { type Raw, toServer } from '@/api/server/transformers';
import type { Server } from '@/api/server/types';
import { http } from '@/lib/http';

interface ServerDetails {
    server: Server;
    permissions: string[];
}

const getServer = async (id: string): Promise<ServerDetails> => {
    const { data } = await http.get(`/api/client/servers/${id}`);

    return {
        server: toServer(data as Raw),
        permissions: data.meta?.is_server_owner ? ['*'] : (data.meta?.user_permissions ?? []),
    };
};

const getWebsocketToken = async (uuid: string): Promise<{ token: string; socket: string }> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/websocket`);

    return { token: data.data.token, socket: data.data.socket };
};

const serverQueryOptions = (id: string) =>
    queryOptions({
        queryKey: ['server', id, 'details'],
        queryFn: () => getServer(id),
        staleTime: 30000,
    });

export { getWebsocketToken, serverQueryOptions };
export type { ServerDetails };
