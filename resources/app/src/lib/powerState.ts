import type { ServerPowerState } from '@/api/server/types';

const POWER_STATE_CLASSES: Record<ServerPowerState, string> = {
    running: 'bg-success',
    starting: 'bg-warning',
    stopping: 'bg-warning',
    offline: 'bg-destructive',
};

const POWER_STATE_LABELS: Record<ServerPowerState, string> = {
    running: 'Running',
    starting: 'Starting',
    stopping: 'Stopping',
    offline: 'Offline',
};

export { POWER_STATE_CLASSES, POWER_STATE_LABELS };
