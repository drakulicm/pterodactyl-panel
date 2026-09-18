import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { EyeIcon, EyeOffIcon, LockIcon, PlusIcon, UnlockIcon, WrenchIcon } from 'lucide-react';
import { useState } from 'react';

import { type AdminNode, nodesQueryOptions } from '@/admin/api/nodes';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { NodeHealthIndicator } from '@/admin/components/nodes/NodeHealthIndicator';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const columns: AdminColumn<AdminNode>[] = [
    {
        header: '',
        className: 'w-10',
        cell: (node) => <NodeHealthIndicator nodeId={node.id} />,
    },
    {
        header: 'Name',
        cell: (node) => (
            <div className='flex items-center gap-2'>
                {node.maintenance_mode && <WrenchIcon className='size-4 text-amber-500' />}
                <Link
                    to='/admin/nodes/view/$nodeId'
                    params={{ nodeId: String(node.id) }}
                    search={{ tab: 'about' }}
                    className='font-medium hover:underline'
                >
                    {node.name}
                </Link>
            </div>
        ),
    },
    {
        header: 'Location',
        cell: (node) => (
            <Link
                to='/admin/locations/view/$locationId'
                params={{ locationId: String(node.location_id) }}
                className='text-muted-foreground hover:underline'
            >
                {node.relationships?.location?.attributes.short ?? node.location_id}
            </Link>
        ),
    },
    {
        header: 'Memory',
        cell: (node) => (
            <span className='tabular-nums'>
                {node.allocated_resources.memory} / {node.memory} MiB
            </span>
        ),
    },
    {
        header: 'Disk',
        cell: (node) => (
            <span className='tabular-nums'>
                {node.allocated_resources.disk} / {node.disk} MiB
            </span>
        ),
    },
    {
        header: 'Servers',
        className: 'text-center',
        cell: (node) => <span className='tabular-nums'>{node.relationships?.servers?.data?.length ?? 0}</span>,
    },
    {
        header: 'SSL',
        className: 'text-center',
        cell: (node) =>
            node.scheme === 'https' ? (
                <Badge variant='secondary'>
                    <LockIcon />
                    SSL
                </Badge>
            ) : (
                <Badge variant='destructive'>
                    <UnlockIcon />
                    No SSL
                </Badge>
            ),
    },
    {
        header: 'Visibility',
        className: 'text-center',
        cell: (node) =>
            node.public ? (
                <Badge variant='outline'>
                    <EyeIcon />
                    Public
                </Badge>
            ) : (
                <Badge variant='outline'>
                    <EyeOffIcon />
                    Private
                </Badge>
            ),
    },
];

const NodesPage: React.FC = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const query = useQuery(nodesQueryOptions({ page, filters: { name: search || undefined } }));

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    return (
        <>
            <PageHeader title='Nodes'>
                <Button size='sm' nativeButton={false} render={<Link to='/admin/nodes/new' />}>
                    <PlusIcon />
                    Create new
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-7xl flex-col gap-4 p-4'>
                <AdminDataTable
                    query={query}
                    columns={columns}
                    getRowKey={(node) => node.id}
                    emptyTitle='No nodes found'
                    emptyDescription='Create a node to start deploying servers onto it.'
                    search={search}
                    searchPlaceholder='Search nodes...'
                    onSearchChange={handleSearchChange}
                    onPageChange={setPage}
                    onRowClick={(node) =>
                        navigate({
                            to: '/admin/nodes/view/$nodeId',
                            params: { nodeId: String(node.id) },
                            search: { tab: 'about' },
                        })
                    }
                />
            </div>
        </>
    );
};

export { NodesPage };
