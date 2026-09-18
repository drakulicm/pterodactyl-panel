type ServerStatus = 'installing' | 'install_failed' | 'reinstall_failed' | 'suspended' | 'restoring_backup' | null;

type ServerPowerState = 'offline' | 'starting' | 'running' | 'stopping';

interface Allocation {
    id: number;
    ip: string;
    alias: string | null;
    port: number;
    notes: string | null;
    isDefault: boolean;
}

interface ServerEggVariable {
    name: string;
    description: string;
    envVariable: string;
    defaultValue: string;
    serverValue: string | null;
    isEditable: boolean;
    rules: string[];
}

interface ServerLimits {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads: string | null;
}

interface Server {
    id: string;
    internalId: number | string;
    uuid: string;
    name: string;
    node: string;
    isNodeUnderMaintenance: boolean;
    status: ServerStatus;
    sftpDetails: { ip: string; port: number };
    invocation: string;
    dockerImage: string;
    description: string | null;
    limits: ServerLimits;
    eggFeatures: string[];
    featureLimits: { databases: number; allocations: number; backups: number };
    isTransferring: boolean;
    skipScripts: boolean;
    variables: ServerEggVariable[];
    allocations: Allocation[];
}

interface ServerStats {
    status: ServerPowerState;
    isSuspended: boolean;
    memoryUsageInBytes: number;
    cpuUsagePercent: number;
    diskUsageInBytes: number;
    networkRxInBytes: number;
    networkTxInBytes: number;
    uptime: number;
}

export type { Allocation, Server, ServerEggVariable, ServerLimits, ServerPowerState, ServerStats, ServerStatus };
