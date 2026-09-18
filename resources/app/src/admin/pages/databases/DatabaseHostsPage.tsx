import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { type AdminDatabaseHost, databaseHostsQueryOptions, getHostDatabases } from '@/admin/api/databases';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { DatabaseHostCreateDialog } from '@/admin/components/databases/DatabaseHostCreateDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';

const DatabaseHostsPage: React.FC = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const hosts = useQuery(databaseHostsQueryOptions({ page, search }));

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const columns: AdminColumn<AdminDatabaseHost>[] = [
        {
            header: 'Name',
            cell: (host) => (
                <Link
                    to='/admin/databases/view/$hostId'
                    params={{ hostId: String(host.id) }}
                    className='font-medium hover:underline'
                >
                    {host.name}
                </Link>
            ),
        },
        {
            header: 'Address',
            cell: (host) => (
                <code className='rounded bg-muted px-2 py-1 font-mono text-xs'>{`${host.host}:${host.port}`}</code>
            ),
        },
        { header: 'Username', cell: (host) => host.username },
        { header: 'Databases', cell: (host) => getHostDatabases(host).length },
        {
            header: 'Node',
            cell: (host) =>
                host.node === null ? (
                    <Badge variant='secondary'>None</Badge>
                ) : (
                    <Link
                        to='/admin/nodes/view/$nodeId'
                        params={{ nodeId: String(host.node) }}
                        search={{ tab: 'about' }}
                        className='hover:underline'
                        onClick={(event) => event.stopPropagation()}
                    >
                        Node #{host.node}
                    </Link>
                ),
        },
    ];

    return (
        <>
            <PageHeader title='Database hosts'>
                <DatabaseHostCreateDialog />
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <AdminDataTable
                    query={hosts}
                    columns={columns}
                    getRowKey={(host) => host.id}
                    emptyTitle='No database hosts'
                    emptyDescription='Database hosts that servers can have databases created on.'
                    search={search}
                    searchPlaceholder='Search by name...'
                    onSearchChange={handleSearchChange}
                    onPageChange={setPage}
                    onRowClick={(host) =>
                        navigate({ to: '/admin/databases/view/$hostId', params: { hostId: String(host.id) } })
                    }
                />
            </div>
        </>
    );
};

export { DatabaseHostsPage };
