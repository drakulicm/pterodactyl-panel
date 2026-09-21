import { keepPreviousData, type QueryClient, queryOptions } from '@tanstack/react-query';

import { getPaginationSet, http, type PaginatedResult, type QueryBuilderParams, withQueryBuilderParams } from '@/lib/http';

interface AdminResource<TAttributes> {
    object: string;
    attributes: TAttributes;
}

interface AdminListParams extends QueryBuilderParams {
    include?: string[];
    perPage?: number;
}

const BASE = '/api/application';

const adminList = async <TAttributes>(path: string, params: AdminListParams = {}): Promise<PaginatedResult<TAttributes>> => {
    const { data } = await http.get(`${BASE}${path}`, {
        params: {
            ...withQueryBuilderParams(params),
            include: params.include?.join(',') || undefined,
            per_page: params.perPage,
        },
    });

    const items = ((data.data ?? []) as AdminResource<TAttributes>[]).map((item) => item.attributes);
    const pagination = data.meta?.pagination
        ? getPaginationSet(data.meta.pagination)
        : { total: items.length, count: items.length, perPage: items.length, currentPage: 1, totalPages: 1 };

    return { items, pagination };
};

const adminGet = async <TAttributes>(path: string, include?: string[]): Promise<TAttributes> => {
    const { data } = await http.get(`${BASE}${path}`, { params: { include: include?.join(',') || undefined } });

    return (data as AdminResource<TAttributes>).attributes;
};

const adminPost = async <TAttributes = void>(path: string, body?: unknown): Promise<TAttributes> => {
    const { data } = await http.post(`${BASE}${path}`, body);

    return (data as AdminResource<TAttributes> | undefined)?.attributes as TAttributes;
};

const adminPatch = async <TAttributes = void>(path: string, body?: unknown): Promise<TAttributes> => {
    const { data } = await http.patch(`${BASE}${path}`, body);

    return (data as AdminResource<TAttributes> | undefined)?.attributes as TAttributes;
};

const adminDelete = async (path: string, body?: unknown): Promise<void> => {
    await http.delete(`${BASE}${path}`, { data: body });
};


const invalidateAdmin = (queryClient: QueryClient, pathPrefix: string) =>
    queryClient.invalidateQueries({
        predicate: (query) =>
            query.queryKey[0] === 'admin' && String(query.queryKey[1] ?? '').startsWith(pathPrefix),
    });

const adminListQueryOptions = <TAttributes>(path: string, params: AdminListParams = {}) =>
    queryOptions({
        queryKey: ['admin', path, params],
        queryFn: () => adminList<TAttributes>(path, params),
        placeholderData: keepPreviousData,
    });

const adminItemQueryOptions = <TAttributes>(path: string, include?: string[]) =>
    queryOptions({
        queryKey: ['admin', path, { include }],
        queryFn: () => adminGet<TAttributes>(path, include),
    });

export {
    adminDelete,
    adminGet,
    adminItemQueryOptions,
    adminList,
    adminListQueryOptions,
    adminPatch,
    adminPost,
    BASE,
    invalidateAdmin,
};
export type { AdminListParams, AdminResource };
