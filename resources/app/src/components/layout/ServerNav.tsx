import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import {
    ArchiveIcon,
    CalendarClockIcon,
    ChevronsUpDownIcon,
    DatabaseIcon,
    FolderIcon,
    HistoryIcon,
    LayoutGridIcon,
    NetworkIcon,
    PlayCircleIcon,
    SettingsIcon,
    TerminalSquareIcon,
    UsersIcon,
} from 'lucide-react';
import { useState } from 'react';

import { serverQueryOptions } from '@/api/server/server';
import { serversQueryOptions } from '@/api/servers';
import { SIDEBAR_LABEL_CLASSES, SidebarDivider, SidebarNavItem } from '@/components/layout/SidebarNavItem';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
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

const RISE_DELAYS = [
    '[--tw-animation-delay:0ms]',
    '[--tw-animation-delay:16ms]',
    '[--tw-animation-delay:32ms]',
    '[--tw-animation-delay:48ms]',
    '[--tw-animation-delay:64ms]',
    '[--tw-animation-delay:80ms]',
    '[--tw-animation-delay:96ms]',
    '[--tw-animation-delay:112ms]',
    '[--tw-animation-delay:128ms]',
    '[--tw-animation-delay:144ms]',
];

const isLinkActive = (pathname: string, target: string, isRoot: boolean): boolean => {
    const current = pathname.replace(/\/$/, '');

    return isRoot ? current === target : current === target || current.startsWith(`${target}/`);
};

const ServerSwitcher: React.FC<{
    id: string;
    name: string;
    onOpenChange: (isOpen: boolean) => void;
}> = ({ id, name, onOpenChange }) => {
    const powerState = useServerStore((state) => state.powerState);
    const [isOpen, setIsOpen] = useState(false);
    const servers = useQuery({ ...serversQueryOptions({}), enabled: isOpen });

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        onOpenChange(open);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger className='relative z-10 flex h-11 w-full shrink-0 items-center gap-1.5 rounded-lg pr-2 pl-0 text-left outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset aria-expanded:bg-sidebar-accent'>
                <span className='relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold uppercase'>
                    {name.slice(0, 2)}
                    <span
                        className={cn(
                            'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-sidebar bg-muted-foreground transition-colors duration-200 ease-out',
                            powerState && POWER_STATE_CLASSES[powerState],
                        )}
                    />
                </span>
                <span className={cn('min-w-0 flex-1', SIDEBAR_LABEL_CLASSES)}>
                    <span className='block truncate text-sm font-medium'>{name}</span>
                    <span className='block truncate text-xs text-muted-foreground'>
                        {powerState ? POWER_STATE_LABELS[powerState] : 'State unknown'}
                    </span>
                </span>
                <ChevronsUpDownIcon className={cn('size-4 shrink-0 text-muted-foreground', SIDEBAR_LABEL_CLASSES)} />
            </DropdownMenuTrigger>
            <DropdownMenuContent side='right' align='start' sideOffset={8} className='min-w-60'>
                <DropdownMenuLabel>Switch server</DropdownMenuLabel>
                {servers.isPending && (
                    <div className='flex justify-center p-2'>
                        <Spinner />
                    </div>
                )}
                {servers.data?.items.map((server) => (
                    <DropdownMenuItem
                        key={server.id}
                        disabled={server.id === id}
                        render={<Link to='/server/$id' params={{ id: server.id }} />}
                    >
                        <span className='truncate'>{server.name}</span>
                        <span className='ml-auto font-mono text-xs text-muted-foreground'>{server.id}</span>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to='/' />}>
                    <LayoutGridIcon />
                    All servers
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const ServerNav: React.FC<{
    id: string;
    onMenuOpenChange: (isOpen: boolean) => void;
}> = ({ id, onMenuOpenChange }) => {
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const { data } = useQuery(serverQueryOptions(id));

    if (!data) {
        return null;
    }

    return (
        <>
            <SidebarDivider />
            <ServerSwitcher id={id} name={data.server.name} onOpenChange={onMenuOpenChange} />
            {SERVER_LINKS.filter((link) => hasAnyPermission(data.permissions, link.permission)).map(
                ({ to, label, icon }, index) => (
                    <SidebarNavItem
                        key={`${id}${to}`}
                        label={label}
                        icon={icon}
                        isActive={isLinkActive(pathname, to.replace('$id', id), to === '/server/$id')}
                        render={<Link to={to} params={{ id }} />}
                        className={cn(
                            'animate-in fill-mode-backwards fade-in-0 slide-in-from-bottom-1.5 duration-250 ease-out-strong',
                            RISE_DELAYS[index],
                        )}
                    />
                ),
            )}
        </>
    );
};

export { SERVER_LINKS, ServerNav };
