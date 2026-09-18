import type { QueryClient } from '@tanstack/react-query';

import {
    adminDelete,
    adminItemQueryOptions,
    adminListQueryOptions,
    adminPatch,
    adminPost,
    type AdminResource,
} from '@/admin/api/client';

const invalidateMounts = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'admin' && String(query.queryKey[1] ?? '').startsWith('/mounts'),
    });

interface AdminMountEgg {
    id: number;
    name: string;
    nest: number;
    description: string | null;
}

interface AdminMountNode {
    id: number;
    name: string;
    fqdn: string;
    location_id: number;
}

interface AdminMountServer {
    id: number;
    identifier: string;
    name: string;
}

interface AdminMount {
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    source: string;
    target: string;
    read_only: boolean;
    user_mountable: boolean;
    eggs_count: number;
    nodes_count: number;
    servers_count: number;
    relationships?: {
        eggs?: { object: string; data?: AdminResource<AdminMountEgg>[] };
        nodes?: { object: string; data?: AdminResource<AdminMountNode>[] };
        servers?: { object: string; data?: AdminResource<AdminMountServer>[] };
    };
}

interface AdminMountPayload {
    name: string;
    description: string | null;
    source: string;
    target: string;
    read_only: boolean;
    user_mountable: boolean;
}

interface AdminMountableNode {
    id: number;
    name: string;
    fqdn: string;
    location_id: number;
    relationships?: {
        location?: AdminResource<{ id: number; short: string; long: string | null }> | null;
    };
}

const mountableNodesQueryOptions = adminListQueryOptions<AdminMountableNode>('/nodes', {
    perPage: 200,
    include: ['location'],
});

const mountsQueryOptions = (params: { page: number; search: string }) =>
    adminListQueryOptions<AdminMount>('/mounts', {
        page: params.page,
        perPage: 50,
        filters: { name: params.search },
    });

const mountQueryOptions = (mountId: string) =>
    adminItemQueryOptions<AdminMount>(`/mounts/${mountId}`, ['eggs', 'nodes', 'servers']);

const createMount = (payload: AdminMountPayload) => adminPost<AdminMount>('/mounts', payload);

const updateMount = (mountId: number, payload: AdminMountPayload) =>
    adminPatch<AdminMount>(`/mounts/${mountId}`, payload);

const deleteMount = (mountId: number) => adminDelete(`/mounts/${mountId}`);

const addMountEggs = (mountId: number, eggs: number[]) => adminPost<AdminMount>(`/mounts/${mountId}/eggs`, { eggs });

const addMountNodes = (mountId: number, nodes: number[]) => adminPost<AdminMount>(`/mounts/${mountId}/nodes`, { nodes });

const detachMountEgg = (mountId: number, eggId: number) => adminDelete(`/mounts/${mountId}/eggs/${eggId}`);

const detachMountNode = (mountId: number, nodeId: number) => adminDelete(`/mounts/${mountId}/nodes/${nodeId}`);

const getMountEggs = (mount: AdminMount): AdminMountEgg[] =>
    (mount.relationships?.eggs?.data ?? []).map((egg) => egg.attributes);

const getMountNodes = (mount: AdminMount): AdminMountNode[] =>
    (mount.relationships?.nodes?.data ?? []).map((node) => node.attributes);

const getMountServers = (mount: AdminMount): AdminMountServer[] =>
    (mount.relationships?.servers?.data ?? []).map((server) => server.attributes);

export {
    addMountEggs,
    addMountNodes,
    createMount,
    deleteMount,
    detachMountEgg,
    detachMountNode,
    getMountEggs,
    getMountNodes,
    getMountServers,
    invalidateMounts,
    mountableNodesQueryOptions,
    mountQueryOptions,
    mountsQueryOptions,
    updateMount,
};
export type { AdminMount, AdminMountableNode, AdminMountEgg, AdminMountNode, AdminMountPayload, AdminMountServer };
