import { queryOptions } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import {
    adminDelete,
    adminGet,
    adminItemQueryOptions,
    adminList,
    adminListQueryOptions,
    adminPatch,
    adminPost,
    type AdminResource,
    BASE,
} from '@/admin/api/client';
import { http, type PaginatedResult } from '@/lib/http';

interface AdminNodeLocation {
    id: number;
    short: string;
    long: string | null;
}

interface AdminNodeServer {
    id: number;
    uuid: string;
    identifier: string;
    name: string;
    user: number;
    nest: number;
    egg: number;
    limits: { memory: number; disk: number };
    relationships?: {
        user?: AdminResource<{ id: number; username: string; email: string }> | null;
        nest?: AdminResource<{ id: number; name: string }> | null;
        egg?: AdminResource<{ id: number; name: string }> | null;
    };
}

interface AdminNode {
    id: number;
    uuid: string;
    public: boolean;
    name: string;
    description: string | null;
    location_id: number;
    fqdn: string;
    scheme: 'http' | 'https';
    behind_proxy: boolean;
    maintenance_mode: boolean;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemon_listen: number;
    daemon_sftp: number;
    daemon_base: string;
    created_at: string;
    updated_at: string;
    allocated_resources: { memory: number; disk: number };
    relationships?: {
        location?: AdminResource<AdminNodeLocation> | null;
        servers?: { object: string; data?: AdminResource<AdminNodeServer>[] } | null;
    };
}

interface AdminNodeBody {
    name: string;
    description: string | null;
    location_id: number;
    public: boolean;
    fqdn: string;
    scheme: 'http' | 'https';
    behind_proxy: boolean;
    maintenance_mode?: boolean;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemon_listen: number;
    daemon_sftp: number;
    daemon_base: string;
    reset_secret?: boolean;
}

interface AdminNodeSystemInformation {
    version: string;
    system: { type: string; arch: string; release: string; cpus: number };
}

interface AdminNodeAllocation {
    id: number;
    ip: string;
    alias: string | null;
    port: number;
    notes: string | null;
    assigned: boolean;
    relationships?: {
        server?: AdminResource<{ id: number; name: string } | null> | null;
    };
}

interface AdminNodeAllocationBody {
    ip: string;
    alias: string | null;
    ports: string[];
}

interface AdminNodeAllocationFilters {
    page: number;
    ip?: string;
    isUnassignedOnly?: boolean;
}

interface AdminNodeDeployToken {
    node: number;
    token: string;
}

const CONFIGURATION_NOT_PERSISTED = 'ConfigurationNotPersistedException';

const NODE_SERVER_INCLUDES = ['servers.user', 'servers.nest', 'servers.egg'];

const nodesQueryOptions = (params: { page: number; filters?: { name?: string; fqdn?: string } }) =>
    adminListQueryOptions<AdminNode>('/nodes', {
        page: params.page,
        filters: params.filters,
        include: ['location', 'servers'],
        perPage: 25,
    });

const nodeQueryOptions = (nodeId: number) => adminItemQueryOptions<AdminNode>(`/nodes/${nodeId}`, ['location', 'servers']);

const nodeServersQueryOptions = (nodeId: number) =>
    queryOptions({
        queryKey: ['admin', `/nodes/${nodeId}`, { include: NODE_SERVER_INCLUDES }],
        queryFn: () => adminGet<AdminNode>(`/nodes/${nodeId}`, NODE_SERVER_INCLUDES),
        select: (node: AdminNode): PaginatedResult<AdminNodeServer> => {
            const items = (node.relationships?.servers?.data ?? []).map((server) => server.attributes);

            return {
                items,
                pagination: {
                    total: items.length,
                    count: items.length,
                    perPage: items.length,
                    currentPage: 1,
                    totalPages: 1,
                },
            };
        },
    });

const nodeLocationsQueryOptions = adminListQueryOptions<AdminNodeLocation>('/locations', { perPage: 500 });

const nodeSystemInformationQueryOptions = (nodeId: number) =>
    queryOptions({
        queryKey: ['admin', `/nodes/${nodeId}`, 'system-information'],
        queryFn: async (): Promise<AdminNodeSystemInformation> => {
            const { data } = await http.get(`${BASE}/nodes/${nodeId}/system-information`);

            return data;
        },
        retry: false,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

const nodeConfigurationQueryOptions = (nodeId: number) =>
    queryOptions({
        queryKey: ['admin', `/nodes/${nodeId}`, 'configuration'],
        queryFn: async (): Promise<Record<string, unknown>> => {
            const { data } = await http.get(`${BASE}/nodes/${nodeId}/configuration`);

            return data;
        },
    });

const nodeAllocationsQueryOptions = (nodeId: number, { page, ip, isUnassignedOnly }: AdminNodeAllocationFilters) =>
    adminListQueryOptions<AdminNodeAllocation>(`/nodes/${nodeId}/allocations`, {
        page,
        filters: { ip: ip || undefined, server_id: isUnassignedOnly ? 'false' : undefined },
        include: ['server'],
        perPage: 50,
    });

const nodeAllocationIpsQueryOptions = (nodeId: number) =>
    queryOptions({
        queryKey: ['admin', `/nodes/${nodeId}/allocations`, 'ips'],
        queryFn: async (): Promise<string[]> => {
            const { items } = await adminList<AdminNodeAllocation>(`/nodes/${nodeId}/allocations`, { perPage: 500 });

            return [...new Set(items.map((allocation) => allocation.ip))].sort();
        },
    });

const createNode = (body: AdminNodeBody): Promise<AdminNode> => adminPost<AdminNode>('/nodes', body);

const updateNode = async (
    nodeId: number,
    body: AdminNodeBody,
): Promise<{ isConfigurationPersisted: boolean; warning: string | null }> => {
    try {
        await adminPatch<AdminNode>(`/nodes/${nodeId}`, body);

        return { isConfigurationPersisted: true, warning: null };
    } catch (error) {
        if (!isAxiosError(error)) {
            throw error;
        }

        const first = (error.response?.data as { errors?: { code?: string; detail?: string }[] } | undefined)?.errors?.[0];
        if (first?.code !== CONFIGURATION_NOT_PERSISTED) {
            throw error;
        }

        return { isConfigurationPersisted: false, warning: first.detail ?? null };
    }
};

const deleteNode = (nodeId: number): Promise<void> => adminDelete(`/nodes/${nodeId}`);

const createNodeDeployToken = async (nodeId: number): Promise<AdminNodeDeployToken> => {
    const { data } = await http.post(`${BASE}/nodes/${nodeId}/auto-deploy-token`);

    return data;
};

const createNodeAllocations = (nodeId: number, body: AdminNodeAllocationBody): Promise<void> =>
    adminPost(`/nodes/${nodeId}/allocations`, body);

const updateNodeAllocationAlias = (nodeId: number, allocationId: number, alias: string | null) =>
    adminPatch<AdminNodeAllocation>(`/nodes/${nodeId}/allocations/${allocationId}`, { ip_alias: alias });

const deleteNodeAllocation = (nodeId: number, allocationId: number): Promise<void> =>
    adminDelete(`/nodes/${nodeId}/allocations/${allocationId}`);

const deleteNodeAllocations = async (nodeId: number, body: { ids: number[] } | { ip: string }): Promise<number> => {
    const { data } = await http.delete(`${BASE}/nodes/${nodeId}/allocations`, { data: body });

    return (data as { deleted: number }).deleted;
};

export {
    createNode,
    createNodeAllocations,
    createNodeDeployToken,
    deleteNode,
    deleteNodeAllocation,
    deleteNodeAllocations,
    nodeAllocationIpsQueryOptions,
    nodeAllocationsQueryOptions,
    nodeConfigurationQueryOptions,
    nodeLocationsQueryOptions,
    nodeQueryOptions,
    nodeServersQueryOptions,
    nodesQueryOptions,
    nodeSystemInformationQueryOptions,
    updateNode,
    updateNodeAllocationAlias,
};
export type {
    AdminNode,
    AdminNodeAllocation,
    AdminNodeAllocationBody,
    AdminNodeBody,
    AdminNodeLocation,
    AdminNodeServer,
    AdminNodeSystemInformation,
};
