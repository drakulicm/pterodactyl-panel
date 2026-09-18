import {
    adminDelete,
    adminItemQueryOptions,
    adminListQueryOptions,
    adminPatch,
    adminPost,
    type AdminResource,
} from '@/admin/api/client';

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
}

interface AdminDatabaseHost {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    node: number | null;
    created_at: string;
    updated_at: string;
    relationships?: {
        databases?: { object: string; data?: AdminResource<AdminServerDatabase>[] };
    };
}

interface AdminDatabaseHostBody {
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    node_id: number | null;
}

interface AdminNodeSummary {
    id: number;
    name: string;
    fqdn: string;
}

const databaseHostsQueryOptions = (params: { page: number; search: string }) =>
    adminListQueryOptions<AdminDatabaseHost>('/database-hosts', {
        page: params.page,
        perPage: 25,
        include: ['databases'],
        filters: { name: params.search },
    });

const databaseHostQueryOptions = (hostId: number) =>
    adminItemQueryOptions<AdminDatabaseHost>(`/database-hosts/${hostId}`, ['databases']);

const databaseHostNodesQueryOptions = adminListQueryOptions<AdminNodeSummary>('/nodes', { perPage: 500 });

const createDatabaseHost = (body: AdminDatabaseHostBody) => adminPost<AdminDatabaseHost>('/database-hosts', body);

const updateDatabaseHost = (hostId: number, body: AdminDatabaseHostBody) =>
    adminPatch<AdminDatabaseHost>(`/database-hosts/${hostId}`, body);

const deleteDatabaseHost = (hostId: number) => adminDelete(`/database-hosts/${hostId}`);

const getHostDatabases = (host: AdminDatabaseHost): AdminServerDatabase[] =>
    (host.relationships?.databases?.data ?? []).map((database) => database.attributes);

export {
    createDatabaseHost,
    databaseHostNodesQueryOptions,
    databaseHostQueryOptions,
    databaseHostsQueryOptions,
    deleteDatabaseHost,
    getHostDatabases,
    updateDatabaseHost,
};
export type { AdminDatabaseHost, AdminDatabaseHostBody, AdminNodeSummary, AdminServerDatabase };
