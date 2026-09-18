import { queryOptions } from '@tanstack/react-query';

import { adminDelete, adminList, BASE } from '@/admin/api/client';
import { http } from '@/lib/http';

interface AdminApiKey {
    identifier: string;
    description: string | null;
    user_id: number;
    allowed_ips: string[];
    permissions: Record<string, number>;
    last_used_at: string | null;
    created_at: string;
}

interface AdminApiKeyResources {
    resources: string[];
    permissions: { none: number; read: number; read_write: number };
}

interface CreateAdminApiKeyBody {
    memo: string;
    [resource: `r_${string}`]: number;
}

const adminApiKeysQueryOptions = queryOptions({
    queryKey: ['admin', '/api-keys'],
    queryFn: async (): Promise<AdminApiKey[]> => (await adminList<AdminApiKey>('/api-keys')).items,
});

const adminApiKeyResourcesQueryOptions = queryOptions({
    queryKey: ['admin', '/api-keys', 'resources'],
    queryFn: async (): Promise<AdminApiKeyResources> => {
        const { data } = await http.get(`${BASE}/api-keys/resources`);

        return data as AdminApiKeyResources;
    },
    staleTime: Infinity,
});

const createAdminApiKey = async (body: CreateAdminApiKeyBody): Promise<{ key: AdminApiKey; secretToken: string }> => {
    const { data } = await http.post(`${BASE}/api-keys`, body);

    return { key: data.attributes as AdminApiKey, secretToken: data.meta.secret_token as string };
};

const deleteAdminApiKey = (identifier: string): Promise<void> => adminDelete(`/api-keys/${identifier}`);

export { adminApiKeyResourcesQueryOptions, adminApiKeysQueryOptions, createAdminApiKey, deleteAdminApiKey };
export type { AdminApiKey, AdminApiKeyResources, CreateAdminApiKeyBody };
