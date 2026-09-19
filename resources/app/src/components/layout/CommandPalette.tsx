import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { SearchIcon, ServerIcon, ShieldIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { serverQueryOptions } from '@/api/server/server';
import { serversQueryOptions } from '@/api/servers';
import { ACCOUNT_LINKS } from '@/components/layout/AppSidebar';
import { SERVER_LINKS } from '@/components/layout/ServerNav';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { hasAnyPermission } from '@/lib/permissions';
import { isNewAdminEnabled, sessionUser } from '@/lib/session';
import { cn } from '@/lib/utils';

const SERVER_RESULT_LIMIT = 6;

interface CommandItem {
    id: string;
    label: string;
    hint?: string;
    icon: React.ComponentType<{ className?: string }>;
    onSelect: () => void;
}

interface CommandGroup {
    label: string;
    items: CommandItem[];
}

const CommandPalette: React.FC<{
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}> = ({ isOpen, onOpenChange }) => {
    const navigate = useNavigate();
    const { id: serverId } = useParams({ strict: false });
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const query = useDebouncedValue(search.trim());

    const servers = useQuery({ ...serversQueryOptions({ query }), enabled: isOpen });
    const server = useQuery({ ...serverQueryOptions(serverId ?? ''), enabled: isOpen && !!serverId });

    const matches = (label: string): boolean => label.toLowerCase().includes(search.trim().toLowerCase());

    const go = (to: string, params?: Record<string, string>) => () => {
        onOpenChange(false);
        navigate({ to, params });
    };

    const serverItems: CommandItem[] = (servers.data?.items ?? []).slice(0, SERVER_RESULT_LIMIT).map((item) => ({
        id: `server-${item.uuid}`,
        label: item.name,
        hint: item.description || item.id,
        icon: ServerIcon,
        onSelect: go('/server/$id', { id: item.id }),
    }));

    const currentServerItems: CommandItem[] =
        serverId && server.data
            ? SERVER_LINKS.filter(
                  (link) =>
                      hasAnyPermission(server.data.permissions, link.permission as string | string[] | null) &&
                      matches(link.label),
              ).map((link) => ({
                  id: `page-${link.to}`,
                  label: link.label,
                  icon: link.icon,
                  onSelect: go(link.to, { id: serverId }),
              }))
            : [];

    const panelItems: CommandItem[] = [
        ...(matches('Servers')
            ? [{ id: 'panel-servers', label: 'Servers', icon: ServerIcon, onSelect: go('/') }]
            : []),
        ...(sessionUser?.rootAdmin && matches('Admin')
            ? [
                  {
                      id: 'panel-admin',
                      label: 'Admin',
                      icon: ShieldIcon,
                      onSelect: isNewAdminEnabled
                          ? go('/admin')
                          : () => {
                                window.location.href = '/admin';
                            },
                  },
              ]
            : []),
        ...ACCOUNT_LINKS.filter((link) => matches(link.label)).map((link) => ({
            id: `account-${link.to}`,
            label: link.label,
            icon: link.icon,
            onSelect: go(link.to),
        })),
    ];

    const groups: CommandGroup[] = [
        { label: 'Servers', items: serverItems },
        { label: server.data?.server.name ?? 'This server', items: currentServerItems },
        { label: 'Panel', items: panelItems },
    ].filter((group) => group.items.length > 0);

    const items = groups.flatMap((group) => group.items);

    useEffect(() => {
        setActiveIndex(0);
    }, [search, servers.data]);

    useEffect(() => {
        if (!isOpen) {
            setSearch('');
        }
    }, [isOpen]);

    useEffect(() => {
        document.getElementById(`command-item-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((previous) => (items.length === 0 ? 0 : (previous + 1) % items.length));

            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((previous) => (items.length === 0 ? 0 : (previous - 1 + items.length) % items.length));

            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            items[activeIndex]?.onSelect();
        }
    };

    let index = -1;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className='top-24 max-w-lg translate-y-0 gap-0 p-0 sm:max-w-lg'>
                <DialogTitle className='sr-only'>Search the panel</DialogTitle>
                <div className='flex items-center gap-2 border-b px-3'>
                    <SearchIcon className='size-4 shrink-0 text-muted-foreground' />
                    <Input
                        aria-label='Search servers and pages.'
                        placeholder='Search servers and pages...'
                        className='h-11 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent'
                        autoFocus
                        autoCorrect='off'
                        autoCapitalize='none'
                        spellCheck={false}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {servers.isFetching && <Spinner className='size-4 shrink-0 text-muted-foreground' />}
                </div>
                <div className='flex max-h-80 flex-col gap-2 overflow-y-auto p-2'>
                    {items.length === 0 ? (
                        <p className='px-2 py-6 text-center text-sm text-muted-foreground'>Nothing matches that.</p>
                    ) : (
                        groups.map((group) => (
                            <div key={group.label} className='flex flex-col'>
                                <span className='px-2 py-1 text-xs text-muted-foreground'>{group.label}</span>
                                {group.items.map((item) => {
                                    index += 1;
                                    const itemIndex = index;

                                    return (
                                        <Button
                                            key={item.id}
                                            id={`command-item-${itemIndex}`}
                                            variant='ghost'
                                            tabIndex={-1}
                                            className={cn(
                                                'h-auto w-full justify-start gap-2 px-2 py-2 text-sm font-normal',
                                                itemIndex === activeIndex && 'bg-accent text-accent-foreground',
                                            )}
                                            onMouseEnter={() => setActiveIndex(itemIndex)}
                                            onClick={item.onSelect}
                                        >
                                            <item.icon className='size-4 shrink-0 text-muted-foreground' />
                                            <span className='truncate'>{item.label}</span>
                                            {item.hint && (
                                                <span className='ml-auto truncate pl-2 text-xs text-muted-foreground'>
                                                    {item.hint}
                                                </span>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export { CommandPalette };
