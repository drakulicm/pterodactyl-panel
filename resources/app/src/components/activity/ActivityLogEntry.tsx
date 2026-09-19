import { format, formatDistanceToNowStrict } from 'date-fns';
import { FolderOpenIcon, TerminalIcon } from 'lucide-react';

import type { ActivityLog } from '@/api/activity';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { describeActivity } from '@/lib/activity';

const ActivityLogEntry: React.FC<{
    activity: ActivityLog;
    onEventClick: (event: string) => void;
}> = ({ activity, onEventClick }) => {
    const segments = describeActivity(activity.event, activity.properties);

    return (
        <div className='flex gap-3 border-b px-4 py-3 last:border-b-0'>
            <Avatar className='mt-0.5 hidden sm:flex'>
                <AvatarFallback>{(activity.actor?.username ?? 'SY').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <div className='flex flex-wrap items-center gap-x-2 text-sm'>
                    <Tooltip>
                        <TooltipTrigger render={<span className='font-medium' />}>
                            {activity.actor?.username ?? 'System'}
                        </TooltipTrigger>
                        <TooltipContent>{activity.actor?.email ?? 'System User'}</TooltipContent>
                    </Tooltip>
                    <span className='text-muted-foreground'>&mdash;</span>
                    <Button
                        variant='link'
                        className='h-auto p-0 font-mono text-xs text-muted-foreground hover:text-foreground'
                        onClick={() => onEventClick(activity.event)}
                    >
                        {activity.event}
                    </Button>
                    {activity.isApi && (
                        <Tooltip>
                            <TooltipTrigger render={<span />}>
                                <TerminalIcon className='size-3.5 text-muted-foreground' />
                            </TooltipTrigger>
                            <TooltipContent>Using API Key</TooltipContent>
                        </Tooltip>
                    )}
                    {activity.event.startsWith('server:sftp.') && (
                        <Tooltip>
                            <TooltipTrigger render={<span />}>
                                <FolderOpenIcon className='size-3.5 text-muted-foreground' />
                            </TooltipTrigger>
                            <TooltipContent>Using SFTP</TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <p className='text-sm break-words text-muted-foreground'>
                    {segments.map((segment, index) =>
                        segment.isHighlighted ? (
                            <strong key={index} className='font-medium text-foreground'>
                                {segment.text}
                            </strong>
                        ) : (
                            <span key={index}>{segment.text}</span>
                        ),
                    )}
                </p>
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    {activity.ip && <span>{activity.ip}</span>}
                    {activity.ip && <span>|</span>}
                    <Tooltip>
                        <TooltipTrigger render={<span />}>
                            {formatDistanceToNowStrict(activity.timestamp, { addSuffix: true })}
                        </TooltipTrigger>
                        <TooltipContent>{format(activity.timestamp, 'MMM do, yyyy H:mm:ss')}</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

export { ActivityLogEntry };
