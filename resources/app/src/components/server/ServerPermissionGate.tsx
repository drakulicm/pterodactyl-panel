import { LockIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useServer } from '@/hooks/useServer';
import { hasAnyPermission } from '@/lib/permissions';

const ServerPermissionGate: React.FC<{
    permission: string | string[];
    title: string;
    children: ReactNode;
}> = ({ permission, title, children }) => {
    const { permissions } = useServer();

    if (hasAnyPermission(permissions, permission)) {
        return children;
    }

    return (
        <>
            <PageHeader title={title} />
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant='icon'>
                        <LockIcon />
                    </EmptyMedia>
                    <EmptyTitle>Not authorized</EmptyTitle>
                    <EmptyDescription>You do not have permission to access this area of the server.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        </>
    );
};

export { ServerPermissionGate };
