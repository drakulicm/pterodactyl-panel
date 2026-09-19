import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { PlusIcon, TriangleAlertIcon, UploadIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    type AdminNest,
    createNest,
    getNestEggs,
    getNestServerCount,
    importEgg,
    invalidateNests,
    nestsQueryOptions,
} from '@/admin/api/nests';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { ImportEggDialog } from '@/admin/components/nests/ImportEggDialog';
import { NestFormDialog } from '@/admin/components/nests/NestFormDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const columns: AdminColumn<AdminNest>[] = [
    {
        header: 'ID',
        className: 'w-16',
        cell: (nest) => <code className='font-mono text-xs text-muted-foreground'>{nest.id}</code>,
    },
    { header: 'Name', cell: (nest) => nest.name },
    {
        header: 'Description',
        className: 'max-w-md text-muted-foreground',
        cell: (nest) => nest.description,
    },
    { header: 'Eggs', className: 'text-center tabular-nums', cell: (nest) => getNestEggs(nest).length },
    { header: 'Servers', className: 'text-center tabular-nums', cell: (nest) => getNestServerCount(nest) },
];

const NestsPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const nests = useQuery(nestsQueryOptions({ page }));

    const invalidate = () => invalidateNests(queryClient);

    const create = useMutation({
        mutationFn: createNest,
        onSuccess: (nest) => {
            toast.success(`A new nest, ${nest.name}, has been successfully created.`);
            invalidate();
            setIsCreateOpen(false);
            navigate({ to: '/admin/nests/view/$nestId', params: { nestId: String(nest.id) } });
        },
    });

    const runImport = useMutation({
        mutationFn: ({ nestId, file }: { nestId: number; file: File }) => importEgg(nestId, file),
        onSuccess: (egg) => {
            toast.success('Successfully imported this Egg and its associated variables.');
            invalidate();
            setIsImportOpen(false);
            navigate({ to: '/admin/nests/egg/$eggId', params: { eggId: String(egg.id) } });
        },
    });

    return (
        <>
            <PageHeader title='Nests'>
                <ImportEggDialog
                    trigger={
                        <Button size='sm' variant='outline'>
                            <UploadIcon />
                            Import egg
                        </Button>
                    }
                    nests={nests.data?.items ?? []}
                    isOpen={isImportOpen}
                    isPending={runImport.isPending}
                    error={runImport.error}
                    onOpenChange={setIsImportOpen}
                    onSubmit={(nestId, file) => runImport.mutate({ nestId, file })}
                />
                <NestFormDialog
                    trigger={
                        <Button size='sm'>
                            <PlusIcon />
                            New nest
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
                <Alert variant='destructive'>
                    <TriangleAlertIcon />
                    <AlertTitle>Eggs are powerful</AlertTitle>
                    <AlertDescription>
                        Eggs are a powerful feature of Pterodactyl Panel that allow for extreme flexibility and
                        configuration. Please note that while powerful, modifying an egg wrongly can very easily brick
                        your servers and cause more problems. Please avoid editing our default eggs — those provided by{' '}
                        <code className='font-mono text-xs'>support@pterodactyl.io</code> — unless you are absolutely
                        sure of what you are doing.
                    </AlertDescription>
                </Alert>
                <AdminDataTable
                    query={nests}
                    columns={columns}
                    getRowKey={(nest) => nest.id}
                    emptyTitle='No nests found'
                    emptyDescription='Create a nest to start grouping eggs together.'
                    onPageChange={setPage}
                    onRowClick={(nest) =>
                        navigate({ to: '/admin/nests/view/$nestId', params: { nestId: String(nest.id) } })
                    }
                />
            </div>
        </>
    );
};

export { NestsPage };
