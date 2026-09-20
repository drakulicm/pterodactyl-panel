import type { QueryClient } from '@tanstack/react-query';

import {
    adminDelete,
    adminGet,
    adminItemQueryOptions,
    adminList,
    adminListQueryOptions,
    adminPatch,
    adminPost,
    type AdminResource,
    BASE,
} from '@/admin/api/client';
import { http } from '@/lib/http';

interface AdminNestServer {
    id: number;
    identifier: string;
    name: string;
}

interface AdminEggConfig {
    files: Record<string, unknown> | null;
    startup: Record<string, unknown> | null;
    stop: string | null;
    logs: Record<string, unknown> | unknown[] | null;
    file_denylist: string[] | null;
    extends: number | null;
}

interface AdminEggScript {
    privileged: boolean;
    install: string | null;
    entry: string;
    container: string;
    extends: number | null;
}

interface AdminEgg {
    id: number;
    uuid: string;
    name: string;
    nest: number;
    author: string;
    description: string | null;
    docker_image: string;
    docker_images: Record<string, string>;
    features: string[] | null;
    force_outgoing_ip: boolean;
    update_url: string | null;
    config: AdminEggConfig;
    startup: string;
    script: AdminEggScript;
    created_at: string;
    updated_at: string;
    relationships?: {
        nest?: AdminResource<AdminNest> | null;
        servers?: { object: string; data?: AdminResource<AdminNestServer>[] };
        variables?: { object: string; data?: AdminResource<AdminEggVariable>[] };
    };
}

interface AdminNest {
    id: number;
    uuid: string;
    author: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    relationships?: {
        eggs?: { object: string; data?: AdminResource<AdminEgg>[] };
        servers?: { object: string; data?: AdminResource<AdminNestServer>[] };
    };
}

interface AdminEggVariable {
    id: number;
    egg_id: number;
    name: string;
    description: string | null;
    env_variable: string;
    default_value: string | null;
    user_viewable: boolean;
    user_editable: boolean;
    rules: string;
    created_at: string;
    updated_at: string;
}

interface AdminNestPayload {
    name: string;
    description: string | null;
}

interface AdminEggPayload {
    name: string;
    description: string | null;
    docker_images: Record<string, string>;
    startup: string;
    features: string[];
    file_denylist: string[];
    force_outgoing_ip: boolean;
    config_from: number | null;
    config_stop: string | null;
    config_startup: unknown;
    config_logs: unknown;
    config_files: unknown;
}

interface AdminEggScriptPayload {
    script_install: string | null;
    script_is_privileged: boolean;
    script_entry: string;
    script_container: string;
    copy_script_from: number | null;
}

interface AdminEggVariablePayload {
    name: string;
    description: string | null;
    env_variable: string;
    default_value: string | null;
    user_viewable: boolean;
    user_editable: boolean;
    rules: string;
}

const invalidateNests = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'admin' && String(query.queryKey[1] ?? '').startsWith('/nests'),
    });

const NEST_INCLUDES = ['eggs', 'servers'];

const nestsQueryOptions = (params: { page: number }) =>
    adminListQueryOptions<AdminNest>('/nests', { page: params.page, perPage: 50, include: NEST_INCLUDES });

const nestQueryOptions = (nestId: string) => adminItemQueryOptions<AdminNest>(`/nests/${nestId}`, NEST_INCLUDES);

const nestEggsQueryOptions = (nestId: number | undefined) =>
    adminListQueryOptions<AdminEgg>(`/nests/${nestId}/eggs`, { include: ['servers'] });

const eggQueryOptions = (nestId: number | undefined, eggId: string) =>
    adminItemQueryOptions<AdminEgg>(`/nests/${nestId}/eggs/${eggId}`, ['nest']);

const eggVariablesQueryOptions = (nestId: number | undefined, eggId: string) =>
    adminListQueryOptions<AdminEggVariable>(`/nests/${nestId}/eggs/${eggId}/variables`);

const createNest = (payload: AdminNestPayload) => adminPost<AdminNest>('/nests', payload);

const updateNest = (nestId: number, payload: AdminNestPayload) => adminPatch<AdminNest>(`/nests/${nestId}`, payload);

const deleteNest = (nestId: number) => adminDelete(`/nests/${nestId}`);

const createEgg = (nestId: number, payload: AdminEggPayload) =>
    adminPost<AdminEgg>(`/nests/${nestId}/eggs`, payload);

const updateEgg = (nestId: number, eggId: number, payload: AdminEggPayload) =>
    adminPatch<AdminEgg>(`/nests/${nestId}/eggs/${eggId}`, payload);

const deleteEgg = (nestId: number, eggId: number) => adminDelete(`/nests/${nestId}/eggs/${eggId}`);

const updateEggScript = (nestId: number, eggId: number, payload: AdminEggScriptPayload) =>
    adminPatch<AdminEgg>(`/nests/${nestId}/eggs/${eggId}/script`, payload);

const createEggVariable = (nestId: number, eggId: number, payload: AdminEggVariablePayload) =>
    adminPost<AdminEggVariable>(`/nests/${nestId}/eggs/${eggId}/variables`, payload);

const updateEggVariable = (nestId: number, eggId: number, variableId: number, payload: AdminEggVariablePayload) =>
    adminPatch<AdminEggVariable>(`/nests/${nestId}/eggs/${eggId}/variables/${variableId}`, payload);

const deleteEggVariable = (nestId: number, eggId: number, variableId: number) =>
    adminDelete(`/nests/${nestId}/eggs/${eggId}/variables/${variableId}`);

const readEggDocument = async (file: File): Promise<unknown> => {
    let document: unknown;

    try {
        document = JSON.parse(await file.text());
    } catch {
        throw new Error('The JSON file provided was not valid.');
    }

    if (!document || typeof document !== 'object' || !('meta' in document)) {
        throw new Error('The JSON file provided is not in a format that can be recognized.');
    }

    return document;
};

type EggImportSource = { file: File } | { url: string };

const toEggImportUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const url = new URL(trimmed);

        return url.protocol === 'http:' || url.protocol === 'https:' ? trimmed : null;
    } catch {
        return null;
    }
};

const toEggImportBody = async (source: EggImportSource): Promise<unknown> =>
    'file' in source ? readEggDocument(source.file) : { import_url: source.url };

const importEgg = async (nestId: number, source: EggImportSource) =>
    adminPost<AdminEgg>(`/nests/${nestId}/import`, await toEggImportBody(source));

const reimportEgg = async (nestId: number, eggId: number, source: EggImportSource) => {
    const { data } = await http.put(`${BASE}/nests/${nestId}/eggs/${eggId}/import`, await toEggImportBody(source));

    return (data as AdminResource<AdminEgg>).attributes;
};

const exportEgg = async (nestId: number, eggId: number, name: string) => {
    const { data } = await http.get(`${BASE}/nests/${nestId}/eggs/${eggId}/export`, { responseType: 'blob' });

    const url = URL.createObjectURL(data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `egg-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const getNestEggs = (nest: AdminNest): AdminEgg[] => (nest.relationships?.eggs?.data ?? []).map((egg) => egg.attributes);

const getNestServerCount = (nest: AdminNest): number => nest.relationships?.servers?.data?.length ?? 0;

const getEggServerCount = (egg: AdminEgg): number => egg.relationships?.servers?.data?.length ?? 0;

const eggNestLookupQueryOptions = {
    queryKey: ['admin', '/nests', 'egg-lookup'],
    queryFn: async (): Promise<Record<number, number>> => {
        const { items } = await adminList<AdminNest>('/nests', { perPage: 200, include: ['eggs'] });

        return items.reduce<Record<number, number>>((result, nest) => {
            getNestEggs(nest).forEach((egg) => {
                result[egg.id] = nest.id;
            });

            return result;
        }, {});
    },
};

const getEgg = (nestId: number, eggId: number) => adminGet<AdminEgg>(`/nests/${nestId}/eggs/${eggId}`);

const toDockerImagesText = (images: Record<string, string>): string =>
    Object.entries(images)
        .map(([label, image]) => (label === image ? image : `${label}|${image}`))
        .join('\n');

const fromDockerImagesText = (text: string): Record<string, string> =>
    text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .reduce<Record<string, string>>((result, line) => {
            const separator = line.indexOf('|');
            if (separator < 0) {
                return { ...result, [line]: line };
            }

            return { ...result, [line.slice(0, separator).trim()]: line.slice(separator + 1).trim() };
        }, {});

const toJsonText = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }

    return JSON.stringify(value, null, 4);
};

export {
    createEgg,
    createEggVariable,
    createNest,
    deleteEgg,
    deleteEggVariable,
    deleteNest,
    eggNestLookupQueryOptions,
    eggQueryOptions,
    eggVariablesQueryOptions,
    exportEgg,
    fromDockerImagesText,
    getEgg,
    getEggServerCount,
    getNestEggs,
    getNestServerCount,
    importEgg,
    invalidateNests,
    nestEggsQueryOptions,
    nestQueryOptions,
    nestsQueryOptions,
    reimportEgg,
    toDockerImagesText,
    toEggImportUrl,
    toJsonText,
    updateEgg,
    updateEggScript,
    updateEggVariable,
    updateNest,
};
export type {
    AdminEgg,
    AdminEggPayload,
    AdminEggScriptPayload,
    AdminEggVariable,
    AdminEggVariablePayload,
    AdminNest,
    AdminNestPayload,
    AdminNestServer,
    EggImportSource,
};
