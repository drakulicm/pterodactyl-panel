import { keepPreviousData, type QueryClient, queryOptions } from '@tanstack/react-query';

import { getPaginationSet, http, type PaginatedResult, type QueryBuilderParams, withQueryBuilderParams } from '@/lib/http';

interface AdminResource<Attributes> {
    object: string;
    attributes: Attributes;
}

interface AdminListParams extends QueryBuilderParams {
    include?: string[];
    perPage?: number;
}

const BASE = '/api/application';

const adminList = async <Attributes>(path: string, params: AdminListParams = {}): Promise<PaginatedResult<Attributes>> => {
    const { data } = await http.get(`${BASE}${path}`, {
        params: {
            ...withQueryBuilderParams(params),
            include: params.include?.join(',') || undefined,
            per_page: params.perPage,
        },
    });

    const items = ((data.data ?? []) as AdminResource<Attributes>[]).map((item) => item.attributes);
    const pagination = data.meta?.pagination
        ? getPaginationSet(data.meta.pagination)
        : { total: items.length, count: items.length, perPage: items.length, currentPage: 1, totalPages: 1 };

    return { items, pagination };
};

const adminGet = async <Attributes>(path: string, include?: string[]): Promise<Attributes> => {
    const { data } = await http.get(`${BASE}${path}`, { params: { include: include?.join(',') || undefined } });

    return (data as AdminResource<Attributes>).attributes;
};

const adminPost = async <Attributes = void>(path: string, body?: unknown): Promise<Attributes> => {
    const { data } = await http.post(`${BASE}${path}`, body);

    return (data as AdminResource<Attributes> | undefined)?.attributes as Attributes;
};

const adminPatch = async <Attributes = void>(path: string, body?: unknown): Promise<Attributes> => {
    const { data } = await http.patch(`${BASE}${path}`, body);

    return (data as AdminResource<Attributes> | undefined)?.attributes as Attributes;
};

const adminDelete = async (path: string, body?: unknown): Promise<void> => {
    await http.delete(`${BASE}${path}`, { data: body });
};


const invalidateAdmin = (queryClient: QueryClient, pathPrefix: string) =>
    queryClient.invalidateQueries({
        predicate: (query) =>
            query.queryKey[0] === 'admin' && String(query.queryKey[1] ?? '').startsWith(pathPrefix),
    });

const adminListQueryOptions = <Attributes>(path: string, params: AdminListParams = {}) =>
    queryOptions({
        queryKey: ['admin', path, params],
        queryFn: () => adminList<Attributes>(path, params),
        placeholderData: keepPreviousData,
    });

const adminItemQueryOptions = <Attributes>(path: string, include?: string[]) =>
    queryOptions({
        queryKey: ['admin', path, { include }],
        queryFn: () => adminGet<Attributes>(path, include),
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
