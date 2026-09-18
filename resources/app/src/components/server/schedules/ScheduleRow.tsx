import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { CalendarClockIcon, ChevronRightIcon } from 'lucide-react';

import type { Schedule } from '@/api/server/schedules';
import { DATE_FORMAT } from '@/components/server/schedules/dateFormat';
import { ScheduleStatusBadge } from '@/components/server/schedules/ScheduleStatusBadge';
import { Button } from '@/components/ui/button';
import { useServer } from '@/hooks/useServer';

const ScheduleRow: React.FC<{
    schedule: Schedule;
}> = ({ schedule }) => {
    const { server } = useServer();
    const { minute, hour, dayOfMonth, month, dayOfWeek } = schedule.cron;

    return (
        <div className='flex items-center gap-4 rounded-lg border bg-card p-3'>
            <CalendarClockIcon className='hidden size-4 shrink-0 text-muted-foreground sm:block' />
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span className='truncate text-sm font-medium'>{schedule.name}</span>
                <span className='text-xs text-muted-foreground'>
                    Last run: {schedule.lastRunAt ? format(schedule.lastRunAt, DATE_FORMAT) : 'never'}
                    {' · '}
                    Next run: {schedule.nextRunAt ? format(schedule.nextRunAt, DATE_FORMAT) : 'n/a'}
                </span>
            </div>
            <code className='hidden rounded bg-muted px-2 py-1 font-mono text-xs md:block'>
                {minute} {hour} {dayOfMonth} {month} {dayOfWeek}
            </code>
            <ScheduleStatusBadge schedule={schedule} />
            <Button
                variant='ghost'
                size='icon-sm'
                aria-label={`Manage ${schedule.name}`}
                render={
                    <Link
                        to='/server/$id/schedules/$scheduleId'
                        params={{ id: server.id, scheduleId: String(schedule.id) }}
                    />
                }
            >
                <ChevronRightIcon />
            </Button>
        </div>
    );
};

export { ScheduleRow };
