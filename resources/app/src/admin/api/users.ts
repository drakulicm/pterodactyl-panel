import { type QueryClient, queryOptions } from '@tanstack/react-query';

import {
    adminDelete,
    adminItemQueryOptions,
    adminListQueryOptions,
    adminPatch,
    adminPost,
    type AdminResource,
    BASE,
} from '@/admin/api/client';
import { http } from '@/lib/http';

interface AdminUserServer {
    id: number;
    uuid: string;
    identifier: string;
    name: string;
    node: number;
    suspended: boolean;
    status: string | null;
}

interface AdminUser {
    id: number;
    external_id: string | null;
    uuid: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    language: string;
    root_admin: boolean;
    '2fa': boolean;
    created_at: string;
    updated_at: string;
    relationships?: {
        servers?: { object: string; data?: AdminResource<AdminUserServer>[] };
    };
}

interface AdminUserPayload {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    language: string;
    root_admin: boolean;
    password?: string;
}

type AdminUserFilter = 'email' | 'username' | 'uuid' | 'external_id';

const invalidateUsers = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'admin' && String(query.queryKey[1] ?? '').startsWith('/users'),
    });

const USER_FILTERS: { value: AdminUserFilter; label: string }[] = [
    { value: 'email', label: 'Email' },
    { value: 'username', label: 'Username' },
    { value: 'uuid', label: 'UUID' },
    { value: 'external_id', label: 'External ID' },
];

const usersQueryOptions = (params: { page: number; filter: AdminUserFilter; search: string }) =>
    adminListQueryOptions<AdminUser>('/users', {
        page: params.page,
        perPage: 50,
        include: ['servers'],
        filters: { [params.filter]: params.search },
    });

const userQueryOptions = (userId: string) => adminItemQueryOptions<AdminUser>(`/users/${userId}`, ['servers']);

const languagesQueryOptions = queryOptions({
    queryKey: ['admin', '/settings/general', 'languages'],
    queryFn: async (): Promise<Record<string, string>> => {
        const { data } = await http.get(`${BASE}/settings/general`);

        return (data as { meta?: { languages?: Record<string, string> } }).meta?.languages ?? { en: 'English' };
    },
    staleTime: Infinity,
});

const withoutBlankPassword = (payload: AdminUserPayload): AdminUserPayload => {
    if (payload.password) {
        return payload;
    }

    const { password: _password, ...rest } = payload;

    return rest;
};

const createUser = (payload: AdminUserPayload) => adminPost<AdminUser>('/users', withoutBlankPassword(payload));

const updateUser = (userId: number, payload: AdminUserPayload) =>
    adminPatch<AdminUser>(`/users/${userId}`, withoutBlankPassword(payload));

const deleteUser = (userId: number) => adminDelete(`/users/${userId}`);

const getUserServers = (user: AdminUser): AdminUserServer[] =>
    (user.relationships?.servers?.data ?? []).map((server) => server.attributes);

export {
    createUser,
    deleteUser,
    getUserServers,
    invalidateUsers,
    languagesQueryOptions,
    updateUser,
    userQueryOptions,
    USER_FILTERS,
    usersQueryOptions,
};
export type { AdminUser, AdminUserFilter, AdminUserPayload, AdminUserServer };
