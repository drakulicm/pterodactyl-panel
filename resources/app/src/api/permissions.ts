import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/http';

interface PermissionGroup {
    description: string;
    keys: Record<string, string>;
}

type PanelPermissions = Record<string, PermissionGroup>;

const getSystemPermissions = async (): Promise<PanelPermissions> => {
    const { data } = await http.get('/api/client/permissions');

    return data.attributes.permissions;
};

const systemPermissionsQueryOptions = queryOptions({
    queryKey: ['account', 'system-permissions'],
    queryFn: getSystemPermissions,
    staleTime: Infinity,
});

export { systemPermissionsQueryOptions };
export type { PanelPermissions, PermissionGroup };
