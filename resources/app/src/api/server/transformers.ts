import type { Allocation, Server, ServerEggVariable } from '@/api/server/types';
import type { FractalResponseData, FractalResponseList } from '@/lib/http';

type Raw = FractalResponseData<Record<string, any>>;
type RawList = FractalResponseList<Record<string, any>>;

const toAllocation = ({ attributes }: Raw): Allocation => ({
    id: attributes.id,
    ip: attributes.ip,
    alias: attributes.ip_alias,
    port: attributes.port,
    notes: attributes.notes,
    isDefault: attributes.is_default,
});

const toEggVariable = ({ attributes }: Raw): ServerEggVariable => ({
    name: attributes.name,
    description: attributes.description,
    envVariable: attributes.env_variable,
    defaultValue: attributes.default_value,
    serverValue: attributes.server_value,
    isEditable: attributes.is_editable,
    rules: String(attributes.rules ?? '').split('|'),
});

const toServer = ({ attributes }: Raw): Server => ({
    id: attributes.identifier,
    internalId: attributes.internal_id,
    uuid: attributes.uuid,
    name: attributes.name,
    node: attributes.node,
    isNodeUnderMaintenance: attributes.is_node_under_maintenance,
    status: attributes.status,
    sftpDetails: { ip: attributes.sftp_details.ip, port: attributes.sftp_details.port },
    invocation: attributes.invocation,
    dockerImage: attributes.docker_image,
    description: attributes.description?.length ? attributes.description : null,
    limits: { ...attributes.limits },
    eggFeatures: attributes.egg_features ?? [],
    featureLimits: { ...attributes.feature_limits },
    isTransferring: attributes.is_transferring,
    skipScripts: attributes.skip_scripts ?? false,
    variables: ((attributes.relationships?.variables as RawList | undefined)?.data ?? []).map(toEggVariable),
    allocations: ((attributes.relationships?.allocations as RawList | undefined)?.data ?? []).map(toAllocation),
});

export { toAllocation, toEggVariable, toServer };
export type { Raw, RawList };
