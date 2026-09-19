import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ExternalLinkIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import {
    type AdminServer,
    type AdminServerFilter,
    formatAllocation,
    getServerAllocations,
    serversQueryOptions,
} from '@/admin/api/servers';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FILTERS = [
    { value: 'name', label: 'Name' },
    { value: 'uuidShort', label: 'Short UUID' },
    { value: 'uuid', label: 'UUID' },
    { value: 'external_id', label: 'External ID' },
    { value: 'image', label: 'Docker image' },
    { value: 'description', label: 'Description' },
] as const;

const ServerStatusBadge: React.FC<{ server: AdminServer }> = ({ server }) => {
    if (server.suspended) {
        return <Badge variant='destructive'>Suspended</Badge>;
    }

    if (server.status === 'install_failed' || server.status === 'reinstall_failed') {
        return <Badge variant='destructive'>Install failed</Badge>;
    }

    if (server.container.installed === 0) {
        return <Badge variant='secondary'>Installing</Badge>;
    }

    if (server.status === 'restoring_backup') {
        return <Badge variant='secondary'>Restoring backup</Badge>;
    }

    return <Badge variant='outline'>Active</Badge>;
};

const ServersPage: React.FC = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<AdminServerFilter>('name');
    const [search, setSearch] = useState('');

    const query = useQuery(serversQueryOptions({ page, filter, search }));

    const columns: AdminColumn<AdminServer>[] = [
        {
            header: 'Server name',
            cell: (server) => (
                <Link
                    to='/admin/servers/view/$serverId'
                    params={{ serverId: String(server.id) }}
                    search={{ tab: 'about' as const }}
                    className='font-medium text-primary hover:underline'
                >
                    {server.name}
                </Link>
            ),
        },
        {
            header: 'UUID',
            cell: (server) => (
                <code className='rounded bg-muted px-1 font-mono text-xs' title={server.uuid}>
                    {server.identifier}
                </code>
            ),
        },
        {
            header: 'Owner',
            cell: (server) => {
                const user = server.relationships?.user?.attributes;
                if (!user) {
                    return <span className='text-muted-foreground'>—</span>;
                }

                return (
                    <Link
                        to='/admin/users/view/$userId'
                        params={{ userId: String(user.id) }}
                        className='text-primary hover:underline'
                    >
                        {user.username}
                    </Link>
                );
            },
        },
        {
            header: 'Node',
            cell: (server) => {
                const node = server.relationships?.node?.attributes;
                if (!node) {
                    return <span className='text-muted-foreground'>—</span>;
                }

                return (
                    <Link
                        to='/admin/nodes/view/$nodeId'
                        params={{ nodeId: String(node.id) }}
                        className='text-primary hover:underline'
                    >
                        {node.name}
                    </Link>
                );
            },
        },
        {
            header: 'Connection',
            cell: (server) => {
                const primary = getServerAllocations(server).find((allocation) => allocation.id === server.allocation);

                return primary ? (
                    <code className='rounded bg-muted px-1 font-mono text-xs'>{formatAllocation(primary)}</code>
                ) : (
                    <span className='text-muted-foreground'>—</span>
                );
            },
        },
        {
            header: 'Status',
            cell: (server) => <ServerStatusBadge server={server} />,
        },
        {
            header: '',
            className: 'w-12 text-right',
            cell: (server) => (
                <Button
                    variant='ghost'
                    size='icon-sm'
                    nativeButton={false}
                    aria-label={`Open ${server.name} in the client area`}
                    render={
                        <a
                            href={`/server/${server.identifier}`}
                            target='_blank'
                            rel='noreferrer'
                            onClick={(event) => event.stopPropagation()}
                        />
                    }
                >
                    <ExternalLinkIcon />
                </Button>
            ),
        },
    ];

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    return (
        <>
            <PageHeader title='Servers'>
                <Button
                    nativeButton={false}
                    size='sm'
                    render={<Link to='/admin/servers/new' />}
                >
                    <PlusIcon />
                    New server
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-7xl flex-col gap-4 p-4'>
                <AdminDataTable
                    query={query}
                    columns={columns}
                    getRowKey={(server) => server.id}
                    emptyTitle='No servers found'
                    emptyDescription='All servers available on the system are listed here.'
                    search={search}
                    searchPlaceholder='Search servers...'
                    onSearchChange={handleSearchChange}
                    onPageChange={setPage}
                    onRowClick={(server) =>
                        navigate({
                            to: '/admin/servers/view/$serverId',
                            params: { serverId: String(server.id) },
                            search: { tab: 'about' as const },
                        })
                    }
                    toolbar={
                        <Select
                            items={FILTERS}
                            value={filter}
                            onValueChange={(value) => value && setFilter(value as AdminServerFilter)}
                        >
                            <SelectTrigger size='sm' aria-label='Search field'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FILTERS.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    }
                />
            </div>
        </>
    );
};

export { ServersPage };
