import { DatabaseIcon, EyeIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import type { ServerDatabase } from '@/api/server/databases';
import { DatabaseDetailsDialog } from '@/components/server/databases/DatabaseDetailsDialog';
import { DeleteDatabaseDialog } from '@/components/server/databases/DeleteDatabaseDialog';
import { Button } from '@/components/ui/button';
import { useServer } from '@/hooks/useServer';
import { hasPermission } from '@/lib/permissions';

const DatabaseColumn: React.FC<{
    label: string;
    value: string;
}> = ({ label, value }) => {
    return (
        <div className='hidden min-w-0 flex-col md:flex'>
            <span className='truncate font-mono text-xs'>{value}</span>
            <span className='text-xs text-muted-foreground'>{label}</span>
        </div>
    );
};

const DatabaseRow: React.FC<{
    database: ServerDatabase;
}> = ({ database }) => {
    const { permissions } = useServer();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    return (
        <div className='flex items-center gap-4 rounded-lg border bg-card p-3'>
            <DatabaseIcon className='size-4 shrink-0 text-muted-foreground' />
            <span className='min-w-0 flex-1 truncate text-sm font-medium'>{database.name}</span>
            <DatabaseColumn label='Endpoint' value={database.connectionString} />
            <DatabaseColumn label='Connections from' value={database.allowConnectionsFrom} />
            <DatabaseColumn label='Username' value={database.username} />
            <div className='flex shrink-0 items-center gap-1'>
                <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label={`View connection details for ${database.name}`}
                    onClick={() => setIsDetailsOpen(true)}
                >
                    <EyeIcon />
                </Button>
                {hasPermission(permissions, 'database.delete') && (
                    <Button
                        variant='ghost'
                        size='icon-sm'
                        aria-label={`Delete ${database.name}`}
                        onClick={() => setIsDeleteOpen(true)}
                    >
                        <Trash2Icon />
                    </Button>
                )}
            </div>
            <DatabaseDetailsDialog database={database} isOpen={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
            <DeleteDatabaseDialog database={database} isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} />
        </div>
    );
};

export { DatabaseRow };
