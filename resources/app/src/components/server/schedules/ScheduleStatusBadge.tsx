import type { Schedule } from '@/api/server/schedules';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const ScheduleStatusBadge: React.FC<{
    schedule: Schedule;
}> = ({ schedule }) => {
    if (schedule.isProcessing) {
        return (
            <Badge variant='secondary'>
                <Spinner />
                Processing
            </Badge>
        );
    }

    return (
        <Badge variant={schedule.isActive ? 'default' : 'outline'}>{schedule.isActive ? 'Active' : 'Inactive'}</Badge>
    );
};

export { ScheduleStatusBadge };
