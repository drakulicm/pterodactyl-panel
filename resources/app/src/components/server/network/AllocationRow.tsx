import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NetworkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    deleteServerAllocation,
    serverAllocationsQueryOptions,
    setPrimaryServerAllocation,
    setServerAllocationNotes,
} from '@/api/server/network';
import { serverQueryOptions } from '@/api/server/server';
import type { Allocation } from '@/api/server/types';
import { ConfirmDeleteButton } from '@/components/layout/ConfirmDeleteButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useServer } from '@/hooks/useServer';
import { formatIp } from '@/lib/format';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';

const NOTES_DEBOUNCE_MS = 750;

const AllocationRow: React.FC<{
    allocation: Allocation;
}> = ({ allocation }) => {
    const { server, permissions } = useServer();
    const queryClient = useQueryClient();
    const [notes, setNotes] = useState(allocation.notes ?? '');
    const savedNotes = useRef(allocation.notes ?? '');
    const timeout = useRef<number | undefined>(undefined);

    const canUpdate = hasPermission(permissions, 'allocation.update');
    const canDelete = hasPermission(permissions, 'allocation.delete');
    const address = allocation.alias ?? formatIp(allocation.ip);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: serverAllocationsQueryOptions(server.uuid).queryKey });
        queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
    };

    const saveNotes = useMutation({
        mutationFn: (value: string) => setServerAllocationNotes(server.uuid, allocation.id, value || null),
        onSuccess: (_, value) => {
            savedNotes.current = value;
            invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const makePrimary = useMutation({
        mutationFn: () => setPrimaryServerAllocation(server.uuid, allocation.id),
        onSuccess: () => {
            toast.success('Primary allocation updated.');
            invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const remove = useMutation({
        mutationFn: () => deleteServerAllocation(server.uuid, allocation.id),
        onSuccess: () => {
            toast.success('Allocation removed.');
            invalidate();
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    useEffect(() => () => window.clearTimeout(timeout.current), []);

    const flushNotes = (value: string) => {
        window.clearTimeout(timeout.current);
        if (value === savedNotes.current) {
            return;
        }

        saveNotes.mutate(value);
    };

    const handleNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.currentTarget.value;
        setNotes(value);
        window.clearTimeout(timeout.current);
        timeout.current = window.setTimeout(() => flushNotes(value), NOTES_DEBOUNCE_MS);
    };

    const handleNotesBlur = () => flushNotes(notes);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(address);
        toast.success('Address copied to clipboard.');
    };

    return (
        <div className='flex flex-wrap items-center gap-4 rounded-lg border p-3 md:flex-nowrap'>
            <NetworkIcon className='size-4 shrink-0 text-muted-foreground' />
            <div className='flex min-w-0 flex-col gap-1 md:w-44'>
                <Button
                    variant='ghost'
                    size='sm'
                    className='h-auto justify-start truncate bg-muted px-2 py-1 font-mono text-xs'
                    title='Copy address'
                    onClick={handleCopy}
                >
                    <span className='truncate'>{address}</span>
                </Button>
                <span className='px-1 text-xs text-muted-foreground uppercase'>
                    {allocation.alias ? 'Hostname' : 'IP address'}
                </span>
            </div>
            <div className='flex w-20 shrink-0 flex-col gap-1'>
                <code className='self-start rounded-md bg-muted px-2 py-1 font-mono text-xs'>{allocation.port}</code>
                <span className='px-1 text-xs text-muted-foreground uppercase'>Port</span>
            </div>
            <div className='relative w-full md:w-auto md:flex-1'>
                <Textarea
                    rows={1}
                    className='min-h-9 resize-none'
                    placeholder='Notes'
                    aria-label={`Notes for ${address}:${allocation.port}`}
                    value={notes}
                    readOnly={!canUpdate}
                    onChange={handleNotesChange}
                    onBlur={handleNotesBlur}
                />
                {saveNotes.isPending && <Spinner className='absolute top-2.5 right-2.5' />}
            </div>
            <div className='flex w-full shrink-0 items-center justify-end gap-2 md:w-44'>
                {allocation.isDefault ? (
                    <Badge>Primary</Badge>
                ) : (
                    <>
                        {canDelete && (
                            <ConfirmDeleteButton
                                title='Remove allocation'
                                description='This allocation will be immediately removed from your server.'
                                label={`Delete allocation ${address}:${allocation.port}`}
                                disabled={remove.isPending}
                                onConfirm={() => remove.mutate()}
                            />
                        )}
                        {canUpdate && (
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={makePrimary.isPending}
                                onClick={() => makePrimary.mutate()}
                            >
                                {makePrimary.isPending && <Spinner />}
                                Make primary
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export { AllocationRow };
