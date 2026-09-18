import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

import { type AdminApiKey, adminApiKeysQueryOptions, deleteAdminApiKey } from '@/admin/api/apiKeys';
import { ApiKeyCreateDialog } from '@/admin/components/apiKeys/ApiKeyCreateDialog';
import { AdminDataTable, type AdminColumn } from '@/admin/components/AdminDataTable';
import { ConfirmDeleteButton } from '@/components/layout/ConfirmDeleteButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { httpErrorToHuman, type PaginatedResult } from '@/lib/http';

const formatDate = (value: string | null): string => (value ? format(value, 'MMM do, yyyy HH:mm') : 'Never');

const ApiKeysPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [createdToken, setCreatedToken] = useState<string | null>(null);

    const keys = useQuery({
        ...adminApiKeysQueryOptions,
        select: (items: AdminApiKey[]): PaginatedResult<AdminApiKey> => ({
            items,
            pagination: {
                total: items.length,
                count: items.length,
                perPage: items.length || 1,
                currentPage: 1,
                totalPages: 1,
            },
        }),
    });

    const revoke = useMutation({
        mutationFn: deleteAdminApiKey,
        onSuccess: () => {
            toast.success('API key has been revoked.');

            return queryClient.invalidateQueries({ queryKey: ['admin', '/api-keys'] });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleCopy = async () => {
        if (!createdToken) {
            return;
        }

        await navigator.clipboard.writeText(createdToken);
        toast.success('API key copied to clipboard.');
    };

    const columns: AdminColumn<AdminApiKey>[] = [
        { header: 'Description', cell: (key) => key.description || <span className='text-muted-foreground'>—</span> },
        {
            header: 'Key',
            cell: (key) => (
                <code className='rounded bg-muted px-2 py-1 font-mono text-xs'>{`${key.identifier}••••••`}</code>
            ),
        },
        { header: 'Last used', cell: (key) => formatDate(key.last_used_at) },
        { header: 'Created', cell: (key) => formatDate(key.created_at) },
        {
            header: '',
            className: 'w-12 text-right',
            cell: (key) => (
                <ConfirmDeleteButton
                    title='Revoke API key'
                    description='Once this API key is revoked any applications currently using it will stop working.'
                    label={`Revoke ${key.identifier}`}
                    disabled={revoke.isPending}
                    onConfirm={() => revoke.mutate(key.identifier)}
                />
            ),
        },
    ];

    return (
        <>
            <PageHeader title='Application API'>
                <ApiKeyCreateDialog onCreated={setCreatedToken} />
            </PageHeader>
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                <AdminDataTable
                    query={keys}
                    columns={columns}
                    getRowKey={(key) => key.identifier}
                    emptyTitle='No application API keys'
                    emptyDescription='Create a set of credentials to control this panel through the application API.'
                />
            </div>
            <Dialog open={!!createdToken} onOpenChange={(open) => !open && setCreatedToken(null)}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Your API key</DialogTitle>
                        <DialogDescription>
                            The API key you requested is shown below. Store it somewhere safe, it will not be shown
                            again.
                        </DialogDescription>
                    </DialogHeader>
                    <code className='rounded-lg bg-muted p-3 font-mono text-sm break-all select-all'>
                        {createdToken}
                    </code>
                    <DialogFooter>
                        <Button variant='outline' onClick={handleCopy}>
                            Copy
                        </Button>
                        <Button onClick={() => setCreatedToken(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export { ApiKeysPage };
