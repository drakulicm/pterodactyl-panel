import { queryOptions } from '@tanstack/react-query';

import { type Raw, toEggVariable } from '@/api/server/transformers';
import type { ServerEggVariable } from '@/api/server/types';
import { http } from '@/lib/http';

interface ServerStartup {
    invocation: string;
    variables: ServerEggVariable[];
    dockerImages: Record<string, string>;
}

interface UpdatedStartupVariable {
    variable: ServerEggVariable;
    invocation: string;
}

const getServerStartup = async (uuid: string): Promise<ServerStartup> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/startup`);

    return {
        variables: ((data.data ?? []) as Raw[]).map(toEggVariable),
        invocation: data.meta.startup_command,
        dockerImages: data.meta.docker_images ?? {},
    };
};

const serverStartupQueryOptions = (uuid: string) =>
    queryOptions({
        queryKey: ['server', uuid, 'startup'],
        queryFn: () => getServerStartup(uuid),
    });

const updateStartupVariable = async (uuid: string, key: string, value: string): Promise<UpdatedStartupVariable> => {
    const { data } = await http.put(`/api/client/servers/${uuid}/startup/variable`, { key, value });

    return { variable: toEggVariable(data as Raw), invocation: data.meta.startup_command };
};

const setSelectedDockerImage = async (uuid: string, image: string): Promise<void> => {
    await http.put(`/api/client/servers/${uuid}/settings/docker-image`, { docker_image: image });
};

export { serverStartupQueryOptions, setSelectedDockerImage, updateStartupVariable };
export type { ServerStartup, UpdatedStartupVariable };
