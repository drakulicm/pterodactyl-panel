import { queryOptions } from '@tanstack/react-query';

import { adminList, BASE } from '@/admin/api/client';
import { http } from '@/lib/http';

interface AdminVersion {
    panel: { current: string; latest: string; is_latest: boolean };
    wings: { latest: string };
    links: { discord: string; donations: string };
}

type AdminCountPath = '/servers' | '/nodes' | '/users' | '/locations';

const versionQueryOptions = queryOptions({
    queryKey: ['admin', '/version'],
    queryFn: async (): Promise<AdminVersion> => {
        const { data } = await http.get(`${BASE}/version`);

        return data as AdminVersion;
    },
    staleTime: 5 * 60 * 1000,
});

const countQueryOptions = (path: AdminCountPath) =>
    queryOptions({
        queryKey: ['admin', path, 'count'],
        queryFn: async (): Promise<number> => {
            const { pagination } = await adminList<unknown>(path, { perPage: 1 });

            return pagination.total;
        },
    });

export { countQueryOptions, versionQueryOptions };
export type { AdminCountPath, AdminVersion };
