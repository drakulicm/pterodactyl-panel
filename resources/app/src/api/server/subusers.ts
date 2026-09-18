import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/http';

interface Subuser {
    uuid: string;
    username: string;
    email: string;
    image: string;
    twoFactorEnabled: boolean;
    createdAt: Date;
    permissions: string[];
}

interface RawSubuser {
    uuid: string;
    username: string;
    email: string;
    image: string;
    '2fa_enabled': boolean;
    created_at: string;
    permissions?: string[];
}

const toSubuser = (data: RawSubuser): Subuser => ({
    uuid: data.uuid,
    username: data.username,
    email: data.email,
    image: data.image,
    twoFactorEnabled: data['2fa_enabled'],
    createdAt: new Date(data.created_at),
    permissions: data.permissions ?? [],
});

const getServerSubusers = async (uuid: string): Promise<Subuser[]> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/users`);

    return ((data.data ?? []) as { attributes: RawSubuser }[]).map(({ attributes }) => toSubuser(attributes));
};

const createOrUpdateSubuser = async (
    uuid: string,
    params: { email: string; permissions: string[] },
    subuserUuid?: string,
): Promise<Subuser> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/users${subuserUuid ? `/${subuserUuid}` : ''}`, {
        email: params.email,
        permissions: params.permissions,
    });

    return toSubuser(data.attributes);
};

const deleteSubuser = async (uuid: string, subuserUuid: string): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/users/${subuserUuid}`);
};

const serverSubusersQueryOptions = (uuid: string) =>
    queryOptions({
        queryKey: ['server', uuid, 'subusers'],
        queryFn: () => getServerSubusers(uuid),
    });

export { createOrUpdateSubuser, deleteSubuser, serverSubusersQueryOptions };
export type { Subuser };
