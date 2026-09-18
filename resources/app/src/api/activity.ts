import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { Raw } from '@/api/server/transformers';
import { getPaginationSet, http, type PaginatedResult, type QueryBuilderParams, withQueryBuilderParams } from '@/lib/http';

interface ActivityActor {
    uuid: string;
    username: string;
    email: string;
    image: string;
}

interface ActivityLog {
    id: string;
    batch: string | null;
    event: string;
    ip: string | null;
    isApi: boolean;
    description: string | null;
    properties: Record<string, unknown>;
    hasAdditionalMetadata: boolean;
    timestamp: Date;
    actor: ActivityActor | null;
}

type ActivityLogFilters = QueryBuilderParams<'ip' | 'event', 'timestamp'>;

const toActivityLog = ({ attributes }: Raw): ActivityLog => {
    const actor = attributes.relationships?.actor as Raw | null | undefined;

    return {
        id: attributes.id,
        batch: attributes.batch,
        event: attributes.event,
        ip: attributes.ip,
        isApi: attributes.is_api,
        description: attributes.description,
        properties: attributes.properties ?? {},
        hasAdditionalMetadata: attributes.has_additional_metadata ?? false,
        timestamp: new Date(attributes.timestamp),
        actor: actor?.attributes
            ? {
                  uuid: actor.attributes.uuid,
                  username: actor.attributes.username,
                  email: actor.attributes.email,
                  image: actor.attributes.image,
              }
            : null,
    };
};

const getActivityLogs = async (url: string, filters: ActivityLogFilters): Promise<PaginatedResult<ActivityLog>> => {
    const { data } = await http.get(url, {
        params: { ...withQueryBuilderParams(filters), include: ['actor'] },
    });

    return {
        items: ((data.data ?? []) as Raw[]).map(toActivityLog),
        pagination: getPaginationSet(data.meta.pagination),
    };
};

const accountActivityQueryOptions = (filters: ActivityLogFilters) =>
    queryOptions({
        queryKey: ['account', 'activity', filters],
        queryFn: () => getActivityLogs('/api/client/account/activity', filters),
        placeholderData: keepPreviousData,
    });

const serverActivityQueryOptions = (server: string, filters: ActivityLogFilters) =>
    queryOptions({
        queryKey: ['server', server, 'activity', filters],
        queryFn: () => getActivityLogs(`/api/client/servers/${server}/activity`, filters),
        placeholderData: keepPreviousData,
    });

export { accountActivityQueryOptions, serverActivityQueryOptions };
export type { ActivityLog, ActivityLogFilters };
