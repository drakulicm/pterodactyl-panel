import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import { type AdminNodeServer, nodeServersQueryOptions } from '@/admin/api/nodes';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';

const columns: AdminColumn<AdminNodeServer>[] = [
    {
        header: 'ID',
        cell: (server) => <code className='font-mono text-xs'>{server.identifier}</code>,
    },
    {
        header: 'Server name',
        cell: (server) => (
            <Link
                to='/admin/servers/view/$serverId'
                params={{ serverId: String(server.id) }}
                search={{ tab: 'about' }}
                className='font-medium hover:underline'
            >
                {server.name}
            </Link>
        ),
    },
    {
        header: 'Owner',
        cell: (server) => (
            <Link
                to='/admin/users/view/$userId'
                params={{ userId: String(server.user) }}
                className='text-muted-foreground hover:underline'
            >
                {server.relationships?.user?.attributes.username ?? server.user}
            </Link>
        ),
    },
    {
        header: 'Service',
        cell: (server) => (
            <span className='text-muted-foreground'>
                {server.relationships?.nest?.attributes.name ?? 'Unknown'} (
                {server.relationships?.egg?.attributes.name ?? 'Unknown'})
            </span>
        ),
    },
];

const NodeServersTab: React.FC<{
    nodeId: number;
}> = ({ nodeId }) => {
    const query = useQuery(nodeServersQueryOptions(nodeId));

    return (
        <AdminDataTable
            query={query}
            columns={columns}
            getRowKey={(server) => server.id}
            emptyTitle='No servers on this node'
            emptyDescription='Servers deployed to this node will be listed here.'
        />
    );
};

export { NodeServersTab };
