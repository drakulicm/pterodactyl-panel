import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/http';

type ScheduleTaskAction = 'command' | 'power' | 'backup';

interface ScheduleCron {
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
}

interface ScheduleTask {
    id: number;
    sequenceId: number;
    action: string;
    payload: string;
    timeOffset: number;
    isQueued: boolean;
    continueOnFailure: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface Schedule {
    id: number;
    name: string;
    cron: ScheduleCron;
    isActive: boolean;
    isProcessing: boolean;
    onlyWhenOnline: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    tasks: ScheduleTask[];
}

interface RawScheduleTask {
    id: number;
    sequence_id: number;
    action: string;
    payload: string;
    time_offset: number;
    is_queued: boolean;
    continue_on_failure: boolean;
    created_at: string;
    updated_at: string;
}

interface RawSchedule {
    id: number;
    name: string;
    cron: { minute: string; hour: string; day_of_month: string; month: string; day_of_week: string };
    is_active: boolean;
    is_processing: boolean;
    only_when_online: boolean;
    last_run_at: string | null;
    next_run_at: string | null;
    created_at: string;
    updated_at: string;
    relationships?: { tasks?: { data?: { attributes: RawScheduleTask }[] } };
}

const toScheduleTask = (data: RawScheduleTask): ScheduleTask => ({
    id: data.id,
    sequenceId: data.sequence_id,
    action: data.action,
    payload: data.payload,
    timeOffset: data.time_offset,
    isQueued: data.is_queued,
    continueOnFailure: data.continue_on_failure,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
});

const toSchedule = (data: RawSchedule): Schedule => ({
    id: data.id,
    name: data.name,
    cron: {
        minute: data.cron.minute,
        hour: data.cron.hour,
        dayOfMonth: data.cron.day_of_month,
        month: data.cron.month,
        dayOfWeek: data.cron.day_of_week,
    },
    isActive: data.is_active,
    isProcessing: data.is_processing,
    onlyWhenOnline: data.only_when_online,
    lastRunAt: data.last_run_at ? new Date(data.last_run_at) : null,
    nextRunAt: data.next_run_at ? new Date(data.next_run_at) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    tasks: (data.relationships?.tasks?.data ?? [])
        .map(({ attributes }) => toScheduleTask(attributes))
        .sort((a, b) => a.sequenceId - b.sequenceId),
});

const getServerSchedules = async (uuid: string): Promise<Schedule[]> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/schedules`, { params: { include: ['tasks'] } });

    return ((data.data ?? []) as { attributes: RawSchedule }[]).map(({ attributes }) => toSchedule(attributes));
};

const getServerSchedule = async (uuid: string, schedule: number): Promise<Schedule> => {
    const { data } = await http.get(`/api/client/servers/${uuid}/schedules/${schedule}`, {
        params: { include: ['tasks'] },
    });

    return toSchedule(data.attributes);
};

const createOrUpdateSchedule = async (
    uuid: string,
    schedule: { id?: number; name: string; cron: ScheduleCron; onlyWhenOnline: boolean; isActive: boolean },
): Promise<Schedule> => {
    const { data } = await http.post(`/api/client/servers/${uuid}/schedules${schedule.id ? `/${schedule.id}` : ''}`, {
        is_active: schedule.isActive,
        only_when_online: schedule.onlyWhenOnline,
        name: schedule.name,
        minute: schedule.cron.minute,
        hour: schedule.cron.hour,
        day_of_month: schedule.cron.dayOfMonth,
        month: schedule.cron.month,
        day_of_week: schedule.cron.dayOfWeek,
    });

    return toSchedule(data.attributes);
};

const deleteSchedule = async (uuid: string, schedule: number): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/schedules/${schedule}`);
};

const triggerScheduleExecution = async (uuid: string, schedule: number): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/schedules/${schedule}/execute`);
};

const createOrUpdateScheduleTask = async (
    uuid: string,
    schedule: number,
    task: number | undefined,
    data: { action: ScheduleTaskAction; payload: string; timeOffset: number; continueOnFailure: boolean },
): Promise<ScheduleTask> => {
    const response = await http.post(
        `/api/client/servers/${uuid}/schedules/${schedule}/tasks${task ? `/${task}` : ''}`,
        {
            action: data.action,
            payload: data.payload,
            continue_on_failure: data.continueOnFailure,
            time_offset: data.timeOffset,
        },
    );

    return toScheduleTask(response.data.attributes);
};

const deleteScheduleTask = async (uuid: string, schedule: number, task: number): Promise<void> => {
    await http.delete(`/api/client/servers/${uuid}/schedules/${schedule}/tasks/${task}`);
};

const serverSchedulesKey = (uuid: string) => ['server', uuid, 'schedules'] as const;

const serverSchedulesQueryOptions = (uuid: string) =>
    queryOptions({
        queryKey: [...serverSchedulesKey(uuid), 'list'],
        queryFn: () => getServerSchedules(uuid),
    });

const serverScheduleQueryOptions = (uuid: string, schedule: number) =>
    queryOptions({
        queryKey: [...serverSchedulesKey(uuid), 'detail', schedule],
        queryFn: () => getServerSchedule(uuid, schedule),
    });

export {
    createOrUpdateSchedule,
    createOrUpdateScheduleTask,
    deleteSchedule,
    deleteScheduleTask,
    serverScheduleQueryOptions,
    serverSchedulesKey,
    serverSchedulesQueryOptions,
    triggerScheduleExecution,
};
export type { Schedule, ScheduleCron, ScheduleTask, ScheduleTaskAction };
