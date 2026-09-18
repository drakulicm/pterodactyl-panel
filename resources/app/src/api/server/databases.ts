import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/http';

interface ServerDatabase {
    id: string;
    name: string;
    username: string;
    connectionString: string;
    allowConnectionsFrom: string;
    password?: string;
}

interface RawServerDatabase {
    id: string;
    name: string;
    username: string;
    host: { address: string; port: number };
    connections_from: string;
    relationships?: { password?: { attributes?: { password?: string } } | null };
}

const toServerDatabase = (data: RawServerDatabase): ServerDatabase => ({
    id: data.id,
    name: data.name,
    username: data.username,
    connectionString: `${data.host.address}:${data.host.port}`,
    allowConnectionsFrom: data.connections_from,
    password: data.relationships?.password?.attributes?.password,
});

const getServerDatabases = async (uuid: string, includePassword: boolean): Promise<ServerDatabase[]> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/databases`, {
        params: includePassword ? { include: 'password' } : undefined,
    });

    return ((data.data ?? []) as { attributes: RawServerDatabase }[]).map(({ attributes }) =>
        toServerDatabase(attributes),
    );
};

const createServerDatabase = async (
    uuid: string,
    data: { databaseName: string; connectionsFrom: string },
): Promise<ServerDatabase> => {
    const response = await http.post(
        `/api/client/servers/${uuid}/databases`,
        { database: data.databaseName, remote: data.connectionsFrom || '%' },
        { params: { include: 'password' } },
    );

    return toServerDatabase(response.data.attributes);
};

const rotateServerDatabasePassword = async (uuid: string, database: string): Promise<ServerDatabase> => {
    const response = await http.post(`/api/client/servers/${uuid}/databases/${database}/rotate-password`);

    return toServerDatabase(response.data.attributes);
};

const deleteServerDatabase = async (uuid: string, database: string): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/databases/${database}`);
};

const serverDatabasesKey = (uuid: string) => ['server', uuid, 'databases'] as const;

const serverDatabasesQueryOptions = (uuid: string, includePassword: boolean) =>
    queryOptions({
        queryKey: [...serverDatabasesKey(uuid), { includePassword }],
        queryFn: () => getServerDatabases(uuid, includePassword),
    });

export {
    createServerDatabase,
    deleteServerDatabase,
    rotateServerDatabasePassword,
    serverDatabasesKey,
    serverDatabasesQueryOptions,
};
export type { ServerDatabase };
