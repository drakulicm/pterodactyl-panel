import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import {
    ArchiveIcon,
    CalendarClockIcon,
    DatabaseIcon,
    FolderIcon,
    HistoryIcon,
    NetworkIcon,
    PlayCircleIcon,
    SettingsIcon,
    TerminalSquareIcon,
    UsersIcon,
} from 'lucide-react';

import { serverQueryOptions } from '@/api/server/server';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { hasAnyPermission } from '@/lib/permissions';
import { POWER_STATE_CLASSES, POWER_STATE_LABELS } from '@/lib/powerState';
import { cn } from '@/lib/utils';
import { useServerStore } from '@/stores/serverStore';

const SERVER_LINKS = [
    { to: '/server/$id', label: 'Console', icon: TerminalSquareIcon, permission: null },
    { to: '/server/$id/files', label: 'Files', icon: FolderIcon, permission: 'file.*' },
    { to: '/server/$id/databases', label: 'Databases', icon: DatabaseIcon, permission: 'database.*' },
    { to: '/server/$id/schedules', label: 'Schedules', icon: CalendarClockIcon, permission: 'schedule.*' },
    { to: '/server/$id/users', label: 'Users', icon: UsersIcon, permission: 'user.*' },
    { to: '/server/$id/backups', label: 'Backups', icon: ArchiveIcon, permission: 'backup.*' },
    { to: '/server/$id/network', label: 'Network', icon: NetworkIcon, permission: 'allocation.*' },
    { to: '/server/$id/startup', label: 'Startup', icon: PlayCircleIcon, permission: 'startup.*' },
    { to: '/server/$id/settings', label: 'Settings', icon: SettingsIcon, permission: ['settings.*', 'file.sftp'] },
    { to: '/server/$id/activity', label: 'Activity', icon: HistoryIcon, permission: 'activity.*' },
] as const;

const isLinkActive = (pathname: string, target: string, isRoot: boolean): boolean => {
    const current = pathname.replace(/\/$/, '');

    return isRoot ? current === target : current === target || current.startsWith(`${target}/`);
};

const ServerNav: React.FC<{
    id: string;
}> = ({ id }) => {
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const powerState = useServerStore((state) => state.powerState);
    const { data } = useQuery(serverQueryOptions(id));

    if (!data) {
        return null;
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel className='gap-2'>
                <span
                    className={cn(
                        'size-2 shrink-0 rounded-full bg-muted-foreground/40 transition-colors duration-200',
                        powerState && POWER_STATE_CLASSES[powerState],
                    )}
                />
                <span className='truncate'>{data.server.name}</span>
                <span className='sr-only'>{powerState ? POWER_STATE_LABELS[powerState] : 'State unknown'}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {SERVER_LINKS.filter((link) => hasAnyPermission(data.permissions, link.permission as string | string[] | null)).map(
                        ({ to, label, icon: Icon }) => (
                            <SidebarMenuItem key={to}>
                                <SidebarMenuButton
                                    isActive={isLinkActive(pathname, to.replace('$id', id), to === '/server/$id')}
                                    tooltip={label}
                                    render={<Link to={to} params={{ id }} />}
                                >
                                    <Icon />
                                    <span>{label}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ),
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
};

export { SERVER_LINKS, ServerNav };
