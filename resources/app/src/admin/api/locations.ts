import {
    adminDelete,
    adminItemQueryOptions,
    adminListQueryOptions,
    adminPatch,
    adminPost,
    type AdminResource,
} from '@/admin/api/client';

interface AdminLocationNode {
    id: number;
    name: string;
    fqdn: string;
    memory: number;
    disk: number;
    maintenance_mode: boolean;
}

interface AdminLocation {
    id: number;
    short: string;
    long: string | null;
    created_at: string;
    updated_at: string;
    relationships?: {
        nodes?: { object: string; data?: AdminResource<AdminLocationNode>[] };
        servers?: { object: string; data?: AdminResource<{ id: number; node: number }>[] };
    };
}

interface AdminLocationBody {
    short: string;
    long: string | null;
}

const locationsQueryOptions = (params: { page: number; search: string }) =>
    adminListQueryOptions<AdminLocation>('/locations', {
        page: params.page,
        perPage: 25,
        include: ['nodes', 'servers'],
        filters: { short: params.search },
    });

const locationQueryOptions = (locationId: number) =>
    adminItemQueryOptions<AdminLocation>(`/locations/${locationId}`, ['nodes', 'servers']);

const createLocation = (body: AdminLocationBody) => adminPost<AdminLocation>('/locations', body);

const updateLocation = (locationId: number, body: AdminLocationBody) =>
    adminPatch<AdminLocation>(`/locations/${locationId}`, body);

const deleteLocation = (locationId: number) => adminDelete(`/locations/${locationId}`);

const getLocationNodes = (location: AdminLocation): AdminLocationNode[] =>
    (location.relationships?.nodes?.data ?? []).map((node) => node.attributes);

const getLocationServerCount = (location: AdminLocation): number => location.relationships?.servers?.data?.length ?? 0;

export {
    createLocation,
    deleteLocation,
    getLocationNodes,
    getLocationServerCount,
    locationQueryOptions,
    locationsQueryOptions,
    updateLocation,
};
export type { AdminLocation, AdminLocationBody, AdminLocationNode };
