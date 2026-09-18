import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { Raw } from '@/api/server/transformers';
import { getPaginationSet, http, type PaginatedResult } from '@/lib/http';

interface ServerBackup {
    uuid: string;
    isSuccessful: boolean;
    isLocked: boolean;
    name: string;
    ignoredFiles: string[];
    checksum: string | null;
    bytes: number;
    createdAt: Date;
    completedAt: Date | null;
}

interface ServerBackupsResult extends PaginatedResult<ServerBackup> {
    backupCount: number;
}

interface CreateBackupValues {
    name?: string;
    ignored?: string;
    isLocked: boolean;
}

const toServerBackup = ({ attributes }: Raw): ServerBackup => ({
    uuid: attributes.uuid,
    isSuccessful: attributes.is_successful,
    isLocked: attributes.is_locked,
    name: attributes.name,
    ignoredFiles: attributes.ignored_files ?? [],
    checksum: attributes.checksum,
    bytes: attributes.bytes,
    createdAt: new Date(attributes.created_at),
    completedAt: attributes.completed_at ? new Date(attributes.completed_at) : null,
});

const getServerBackups = async (uuid: string, page: number): Promise<ServerBackupsResult> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/backups`, { params: { page } });

    return {
        items: ((data.data ?? []) as Raw[]).map(toServerBackup),
        pagination: getPaginationSet(data.meta.pagination),
        backupCount: data.meta.backup_count ?? 0,
    };
};

const serverBackupsKey = (uuid: string) => ['server', uuid, 'backups'] as const;

const serverBackupsQueryOptions = (uuid: string, page: number) =>
    queryOptions({
        queryKey: [...serverBackupsKey(uuid), page],
        queryFn: () => getServerBackups(uuid, page),
        placeholderData: keepPreviousData,
    });

const createServerBackup = async (uuid: string, values: CreateBackupValues): Promise<ServerBackup> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/backups`, {
        name: values.name,
        ignored: values.ignored,
        is_locked: values.isLocked,
    });

    return toServerBackup(data as Raw);
};

const deleteServerBackup = async (uuid: string, backup: string): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/backups/${backup}`);
};

const getServerBackupDownloadUrl = async (uuid: string, backup: string): Promise<string> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/backups/${backup}/download`);

    return data.attributes.url;
};

const restoreServerBackup = async (uuid: string, backup: string, truncate: boolean): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/backups/${backup}/restore`, { truncate });
};

const toggleServerBackupLock = async (uuid: string, backup: string): Promise<ServerBackup> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/backups/${backup}/lock`);

    return toServerBackup(data as Raw);
};

export {
    createServerBackup,
    deleteServerBackup,
    getServerBackupDownloadUrl,
    restoreServerBackup,
    serverBackupsKey,
    serverBackupsQueryOptions,
    toggleServerBackupLock,
};
export type { CreateBackupValues, ServerBackup, ServerBackupsResult };
