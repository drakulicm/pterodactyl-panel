import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { HardDriveDownloadIcon, PauseCircleIcon, ServerCogIcon, TruckIcon, WrenchIcon } from 'lucide-react';

import { serverQueryOptions } from '@/api/server/server';
import type { Server } from '@/api/server/types';
import { ServerFeatures } from '@/components/server/ServerFeatures';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { useServerSocket } from '@/hooks/useServerSocket';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { sessionUser } from '@/lib/session';
import { SocketEvent } from '@/lib/socketEvents';
import { type SocketError, useServerStore } from '@/stores/serverStore';

const SOCKET_ERROR_MESSAGES: Record<Exclude<SocketError, null>, string> = {
    connecting: "We're having some trouble connecting to your server, please wait...",
    failed: 'Failed to connect to websocket instance after multiple attempts: try refreshing the page.',
    credentials: 'There was an error validating the credentials provided for the websocket. Please refresh the page.',
};

const getConflictState = (
    server: Server,
): { icon: React.ComponentType; title: string; description: string } | null => {
    if (server.status === 'installing' || server.status === 'install_failed' || server.status === 'reinstall_failed') {
        return {
            icon: ServerCogIcon,
            title: 'Running installer',
            description: 'Your server should be ready soon, please try again in a few minutes.',
        };
    }

    if (server.status === 'suspended') {
        return {
            icon: PauseCircleIcon,
            title: 'Server suspended',
            description: 'This server is suspended and cannot be accessed.',
        };
    }

    if (server.isNodeUnderMaintenance) {
        return {
            icon: WrenchIcon,
            title: 'Node under maintenance',
            description: 'The node of this server is currently under maintenance.',
        };
    }

    if (server.isTransferring) {
        return {
            icon: TruckIcon,
            title: 'Transferring',
            description: 'Your server is being transferred to a new node, please check back later.',
        };
    }

    if (server.status === 'restoring_backup') {
        return {
            icon: HardDriveDownloadIcon,
            title: 'Restoring from backup',
            description: 'Your server is currently being restored from a backup, please check back in a few minutes.',
        };
    }

    return null;
};

const ServerLayout: React.FC = () => {
    const queryClient = useQueryClient();
    const { server } = useServer();
    const socketError = useServerStore((state) => state.socketError);
    const pathname = useRouterState({ select: (state) => state.location.pathname });

    useServerSocket(server.uuid);

    const handleRefetch = () => {
        queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
    };

    useSocketEvent(SocketEvent.INSTALL_STARTED, handleRefetch);
    useSocketEvent(SocketEvent.INSTALL_COMPLETED, handleRefetch);
    useSocketEvent(SocketEvent.TRANSFER_STATUS, handleRefetch);
    useSocketEvent(SocketEvent.BACKUP_RESTORE_COMPLETED, handleRefetch);

    const conflict = getConflictState(server);
    const isConsolePath = pathname.replace(/\/$/, '') === `/server/${server.id}`;
    const isConflictVisible = conflict && !(sessionUser?.rootAdmin && isConsolePath);

    return (
        <>
            {socketError && (
                <div className='flex items-center justify-center gap-2 bg-destructive/15 px-4 py-2 text-sm text-red-300'>
                    {socketError === 'connecting' && <Spinner />}
                    {SOCKET_ERROR_MESSAGES[socketError]}
                </div>
            )}
            {isConflictVisible ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant='icon'>
                            <conflict.icon />
                        </EmptyMedia>
                        <EmptyTitle>{conflict.title}</EmptyTitle>
                        <EmptyDescription>{conflict.description}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Outlet />
            )}
            <ServerFeatures />
        </>
    );
};

export { ServerLayout };
