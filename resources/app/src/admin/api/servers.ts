import { queryOptions } from '@tanstack/react-query';

import {
    adminDelete,
    adminItemQueryOptions,
    adminList,
    adminListQueryOptions,
    adminPatch,
    adminPost,
    type AdminResource,
    BASE,
} from '@/admin/api/client';
import { http } from '@/lib/http';

interface AdminServerAllocation {
    id: number;
    ip: string;
    alias: string | null;
    port: number;
    notes: string | null;
    assigned: boolean;
}

interface AdminServerLimits {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads: string | null;
    oom_disabled: boolean;
}

interface AdminServerFeatureLimits {
    databases: number | null;
    allocations: number | null;
    backups: number | null;
}

interface AdminServerUser {
    id: number;
    uuid: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    root_admin: boolean;
}

interface AdminServerNode {
    id: number;
    name: string;
    location_id: number;
    fqdn: string;
    maintenance_mode: boolean;
}

interface AdminServerNest {
    id: number;
    name: string;
}

interface AdminServerVariable {
    id: number;
    egg_id: number;
    name: string;
    description: string;
    env_variable: string;
    default_value: string | null;
    user_viewable: boolean;
    user_editable: boolean;
    rules: string;
    server_value: string | null;
}

interface AdminEgg {
    id: number;
    uuid: string;
    name: string;
    nest: number;
    description: string | null;
    docker_image: string;
    docker_images: Record<string, string>;
    startup: string;
    relationships?: {
        variables?: { object: string; data?: AdminResource<AdminServerVariable>[] } | null;
    };
}

interface AdminNest {
    id: number;
    name: string;
    description: string | null;
    relationships?: {
        eggs?: { object: string; data?: AdminResource<AdminEgg>[] } | null;
    };
}

interface AdminServerLocation {
    id: number;
    short: string;
    long: string | null;
    relationships?: {
        nodes?: { object: string; data?: AdminResource<AdminServerNode>[] } | null;
    };
}

interface AdminServer {
    id: number;
    external_id: string | null;
    uuid: string;
    identifier: string;
    name: string;
    description: string;
    status: string | null;
    suspended: boolean;
    limits: AdminServerLimits;
    feature_limits: AdminServerFeatureLimits;
    user: number;
    node: number;
    allocation: number;
    nest: number;
    egg: number;
    container: {
        startup_command: string;
        image: string;
        installed: number;
        environment: Record<string, string | number | null>;
        skip_scripts: boolean;
    };
    created_at: string;
    updated_at: string;
    relationships?: {
        allocations?: { object: string; data?: AdminResource<AdminServerAllocation>[] } | null;
        user?: AdminResource<AdminServerUser> | null;
        node?: AdminResource<AdminServerNode> | null;
        nest?: AdminResource<AdminServerNest> | null;
        egg?: AdminResource<AdminEgg> | null;
        location?: AdminResource<AdminServerLocation> | null;
        variables?: { object: string; data?: AdminResource<AdminServerVariable>[] } | null;
    };
}

interface AdminServerDatabase {
    id: number;
    server: number;
    host: number;
    database: string;
    username: string;
    remote: string;
    max_connections: number | null;
    created_at: string;
    updated_at: string;
    relationships?: {
        host?: AdminResource<{ id: number; name: string; host: string; port: number }> | null;
    };
}

interface AdminServerMount {
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    source: string;
    target: string;
    read_only: boolean;
    user_mountable: boolean;
}

interface AdminDatabaseHost {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    node: number | null;
}

interface AdminServerStorePayload {
    name: string;
    user: number;
    description: string | null;
    external_id?: string | null;
    egg: number;
    docker_image: string;
    startup: string;
    environment: Record<string, string>;
    skip_scripts: boolean;
    oom_disabled: boolean;
    start_on_completion: boolean;
    limits: {
        memory: number;
        swap: number;
        disk: number;
        io: number;
        cpu: number;
        threads: string | null;
    };
    feature_limits: {
        databases: number | null;
        allocations: number | null;
        backups: number | null;
    };
    allocation: {
        default: number;
        additional: number[];
    };
}

interface AdminServerDetailsPayload {
    name: string;
    user: number;
    external_id: string | null;
    description: string | null;
}

interface AdminServerBuildPayload {
    allocation: number;
    oom_disabled: boolean;
    limits: {
        memory: number;
        swap: number;
        disk: number;
        io: number;
        cpu: number;
        threads: string | null;
    };
    feature_limits: {
        databases: number | null;
        allocations: number | null;
        backups: number | null;
    };
    add_allocations: number[];
    remove_allocations: number[];
}

interface AdminServerStartupPayload {
    startup: string;
    environment: Record<string, string>;
    egg: number;
    image: string;
    skip_scripts: boolean;
}

interface AdminServerTransferPayload {
    node_id: number;
    allocation_id: number;
    allocation_additional: number[];
}

type AdminServerFilter = 'name' | 'uuid' | 'uuidShort' | 'external_id' | 'image' | 'description';

const SERVER_INCLUDES = ['user', 'node', 'allocations', 'nest', 'egg', 'variables', 'location'];

const serversQueryOptions = (params: { page: number; filter: AdminServerFilter; search: string }) =>
    adminListQueryOptions<AdminServer>('/servers', {
        page: params.page,
        perPage: 25,
        include: ['user', 'node', 'allocations'],
        filters: { [params.filter]: params.search },
    });

const serverQueryOptions = (serverId: number) =>
    adminItemQueryOptions<AdminServer>(`/servers/${serverId}`, SERVER_INCLUDES);

const serverDatabasesQueryOptions = (serverId: number) =>
    adminListQueryOptions<AdminServerDatabase>(`/servers/${serverId}/databases`, { include: ['host'] });

const databaseHostsQueryOptions = adminListQueryOptions<AdminDatabaseHost>('/database-hosts', { perPage: 200 });

const serverLocationsQueryOptions = adminListQueryOptions<AdminServerLocation>('/locations', {
    perPage: 200,
    include: ['nodes'],
});

const serverNestsQueryOptions = adminListQueryOptions<AdminNest>('/nests', { perPage: 200, include: ['eggs'] });

const serverEggQueryOptions = (nestId: number | null, eggId: number | null) =>
    queryOptions({
        queryKey: ['admin', `/nests/${nestId}/eggs/${eggId}`, { include: ['variables'] }],
        queryFn: async (): Promise<AdminEgg> => {
            const { data } = await http.get(`${BASE}/nests/${nestId}/eggs/${eggId}`, {
                params: { include: 'variables' },
            });

            return (data as AdminResource<AdminEgg>).attributes;
        },
        enabled: !!nestId && !!eggId,
    });

const nodeAllocationsQueryOptions = (nodeId: number | null, isUnassignedOnly: boolean) =>
    queryOptions({
        queryKey: ['admin', `/nodes/${nodeId}/allocations`, { unassigned: isUnassignedOnly }],
        queryFn: async (): Promise<AdminServerAllocation[]> => {
            const { items } = await adminList<AdminServerAllocation>(`/nodes/${nodeId}/allocations`, {
                perPage: 500,
                filters: isUnassignedOnly ? { server_id: 'false' } : undefined,
            });

            return items;
        },
        enabled: !!nodeId,
    });

const serverMountsQueryOptions = (serverId: number) =>
    queryOptions({
        queryKey: ['admin', `/servers/${serverId}/mounts`],
        queryFn: async (): Promise<{ mounts: AdminServerMount[]; mounted: number[] }> => {
            const { data } = await http.get(`${BASE}/servers/${serverId}/mounts`);
            const body = data as { data?: AdminResource<AdminServerMount>[]; meta?: { mounted?: number[] } };

            return {
                mounts: (body.data ?? []).map((item) => item.attributes),
                mounted: body.meta?.mounted ?? [],
            };
        },
    });

const userSearchQueryOptions = (search: string) =>
    queryOptions({
        queryKey: ['admin', '/users', { search }],
        queryFn: async (): Promise<AdminServerUser[]> => {
            const { items } = await adminList<AdminServerUser>('/users', {
                perPage: 25,
                filters: { email: search },
            });

            return items;
        },
        enabled: search.length >= 2,
    });

const createServer = (payload: AdminServerStorePayload) => adminPost<AdminServer>('/servers', payload);

const updateServerDetails = (serverId: number, payload: AdminServerDetailsPayload) =>
    adminPatch<AdminServer>(`/servers/${serverId}/details`, payload);

const updateServerBuild = (serverId: number, payload: AdminServerBuildPayload) =>
    adminPatch<AdminServer>(`/servers/${serverId}/build`, payload);

const updateServerStartup = (serverId: number, payload: AdminServerStartupPayload) =>
    adminPatch<AdminServer>(`/servers/${serverId}/startup`, payload);

const createServerDatabase = (serverId: number, payload: { database: string; remote: string; host: number }) =>
    adminPost<AdminServerDatabase>(`/servers/${serverId}/databases`, payload);

const resetServerDatabasePassword = (serverId: number, databaseId: number) =>
    adminPost(`/servers/${serverId}/databases/${databaseId}/reset-password`);

const deleteServerDatabase = (serverId: number, databaseId: number) =>
    adminDelete(`/servers/${serverId}/databases/${databaseId}`);

const attachServerMount = (serverId: number, mountId: number) =>
    adminPost(`/servers/${serverId}/mounts`, { mount_id: mountId });

const detachServerMount = (serverId: number, mountId: number) =>
    adminDelete(`/servers/${serverId}/mounts/${mountId}`);

const reinstallServer = (serverId: number) => adminPost(`/servers/${serverId}/reinstall`);

const toggleServerInstallStatus = (serverId: number) => adminPost<AdminServer>(`/servers/${serverId}/toggle-install`);

const suspendServer = (serverId: number) => adminPost(`/servers/${serverId}/suspend`);

const unsuspendServer = (serverId: number) => adminPost(`/servers/${serverId}/unsuspend`);

const transferServer = (serverId: number, payload: AdminServerTransferPayload) =>
    adminPost(`/servers/${serverId}/transfer`, payload);

const deleteServer = (serverId: number, isForced: boolean) =>
    adminDelete(`/servers/${serverId}${isForced ? '/force' : ''}`);

const getServerAllocations = (server: AdminServer): AdminServerAllocation[] =>
    (server.relationships?.allocations?.data ?? []).map((item) => item.attributes);

const getServerVariables = (server: AdminServer): AdminServerVariable[] =>
    (server.relationships?.variables?.data ?? []).map((item) => item.attributes);

const getEggVariables = (egg: AdminEgg | undefined): AdminServerVariable[] =>
    (egg?.relationships?.variables?.data ?? []).map((item) => item.attributes);

const getNestEggs = (nest: AdminNest): AdminEgg[] => (nest.relationships?.eggs?.data ?? []).map((item) => item.attributes);

const getLocationNodes = (location: AdminServerLocation): AdminServerNode[] =>
    (location.relationships?.nodes?.data ?? []).map((item) => item.attributes);

const formatAllocation = (allocation: AdminServerAllocation): string =>
    `${allocation.alias ?? allocation.ip}:${allocation.port}`;

export {
    attachServerMount,
    createServer,
    createServerDatabase,
    databaseHostsQueryOptions,
    deleteServer,
    deleteServerDatabase,
    detachServerMount,
    formatAllocation,
    getEggVariables,
    getLocationNodes,
    getNestEggs,
    getServerAllocations,
    getServerVariables,
    nodeAllocationsQueryOptions,
    reinstallServer,
    resetServerDatabasePassword,
    serverDatabasesQueryOptions,
    serverEggQueryOptions,
    serverLocationsQueryOptions,
    serverMountsQueryOptions,
    serverNestsQueryOptions,
    serverQueryOptions,
    serversQueryOptions,
    suspendServer,
    toggleServerInstallStatus,
    transferServer,
    unsuspendServer,
    updateServerBuild,
    updateServerDetails,
    updateServerStartup,
    userSearchQueryOptions,
};
export type {
    AdminDatabaseHost,
    AdminEgg,
    AdminNest,
    AdminServer,
    AdminServerAllocation,
    AdminServerBuildPayload,
    AdminServerDatabase,
    AdminServerDetailsPayload,
    AdminServerFeatureLimits,
    AdminServerFilter,
    AdminServerLimits,
    AdminServerLocation,
    AdminServerMount,
    AdminServerNest,
    AdminServerNode,
    AdminServerStartupPayload,
    AdminServerStorePayload,
    AdminServerTransferPayload,
    AdminServerUser,
    AdminServerVariable,
};
