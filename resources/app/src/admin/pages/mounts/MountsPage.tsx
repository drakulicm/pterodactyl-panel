import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { type AdminMount, createMount, invalidateMounts, mountsQueryOptions } from '@/admin/api/mounts';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { MountFormDialog } from '@/admin/components/mounts/MountFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const columns: AdminColumn<AdminMount>[] = [
    {
        header: 'ID',
        className: 'w-16',
        cell: (mount) => <code className='font-mono text-xs text-muted-foreground'>{mount.id}</code>,
    },
    {
        header: 'Name',
        cell: (mount) => (
            <span className='flex items-center gap-1.5'>
                {mount.name}
                {mount.read_only && <Badge variant='secondary'>Read only</Badge>}
            </span>
        ),
    },
    {
        header: 'Source',
        cell: (mount) => <code className='font-mono text-xs text-muted-foreground'>{mount.source}</code>,
    },
    {
        header: 'Target',
        cell: (mount) => <code className='font-mono text-xs text-muted-foreground'>{mount.target}</code>,
    },
    { header: 'Eggs', className: 'text-center tabular-nums', cell: (mount) => mount.eggs_count },
    { header: 'Nodes', className: 'text-center tabular-nums', cell: (mount) => mount.nodes_count },
    { header: 'Servers', className: 'text-center tabular-nums', cell: (mount) => mount.servers_count },
];

const MountsPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const mounts = useQuery(mountsQueryOptions({ page, search }));

    const create = useMutation({
        mutationFn: createMount,
        onSuccess: (mount) => {
            toast.success('Mount was created successfully.');
            invalidateMounts(queryClient);
            setIsCreateOpen(false);
            navigate({ to: '/admin/mounts/view/$mountId', params: { mountId: String(mount.id) } });
        },
    });

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    return (
        <>
            <PageHeader title='Mounts'>
                <MountFormDialog
                    trigger={
                        <Button size='sm'>
                            <PlusIcon />
                            Create new
                        </Button>
                    }
                    isOpen={isCreateOpen}
                    isPending={create.isPending}
                    error={create.error}
                    onOpenChange={setIsCreateOpen}
                    onSubmit={(payload) => create.mutate(payload)}
                />
            </PageHeader>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 p-4'>
                <p className='text-sm text-muted-foreground'>
                    Configure and manage additional mount points for servers.
                </p>
                <AdminDataTable
                    query={mounts}
                    columns={columns}
                    getRowKey={(mount) => mount.id}
                    emptyTitle='No mounts found'
                    emptyDescription='Create a mount to make host directories available inside server containers.'
                    search={search}
                    searchPlaceholder='Search mounts...'
                    onSearchChange={handleSearchChange}
                    onPageChange={setPage}
                    onRowClick={(mount) =>
                        navigate({ to: '/admin/mounts/view/$mountId', params: { mountId: String(mount.id) } })
                    }
                />
            </div>
        </>
    );
};

export { MountsPage };
