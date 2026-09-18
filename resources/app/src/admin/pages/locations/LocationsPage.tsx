import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
    type AdminLocation,
    getLocationNodes,
    getLocationServerCount,
    locationsQueryOptions,
} from '@/admin/api/locations';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { LocationCreateDialog } from '@/admin/components/locations/LocationCreateDialog';
import { PageHeader } from '@/components/layout/PageHeader';

const LocationsPage: React.FC = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const locations = useQuery(locationsQueryOptions({ page, search }));

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const columns: AdminColumn<AdminLocation>[] = [
        {
            header: 'Short code',
            cell: (location) => (
                <Link
                    to='/admin/locations/view/$locationId'
                    params={{ locationId: String(location.id) }}
                    className='font-medium hover:underline'
                >
                    {location.short}
                </Link>
            ),
        },
        {
            header: 'Description',
            cell: (location) => location.long || <span className='text-muted-foreground'>—</span>,
        },
        { header: 'Nodes', cell: (location) => getLocationNodes(location).length },
        { header: 'Servers', cell: (location) => getLocationServerCount(location) },
    ];

    return (
        <>
            <PageHeader title='Locations'>
                <LocationCreateDialog />
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <AdminDataTable
                    query={locations}
                    columns={columns}
                    getRowKey={(location) => location.id}
                    emptyTitle='No locations'
                    emptyDescription='All locations that nodes can be assigned to for easier categorization.'
                    search={search}
                    searchPlaceholder='Search by short code...'
                    onSearchChange={handleSearchChange}
                    onPageChange={setPage}
                    onRowClick={(location) =>
                        navigate({
                            to: '/admin/locations/view/$locationId',
                            params: { locationId: String(location.id) },
                        })
                    }
                />
            </div>
        </>
    );
};

export { LocationsPage };
