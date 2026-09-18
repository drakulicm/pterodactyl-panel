import { PlayIcon, RotateCwIcon, SquareIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useServer } from '@/hooks/useServer';
import { hasPermission } from '@/lib/permissions';
import { SocketRequest } from '@/lib/socketEvents';
import { useServerStore } from '@/stores/serverStore';

type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

const PowerButtons: React.FC = () => {
    const { permissions } = useServer();
    const socket = useServerStore((state) => state.socket);
    const powerState = useServerStore((state) => state.powerState);
    const [isKillConfirmOpen, setIsKillConfirmOpen] = useState(false);
    const isKillable = powerState === 'stopping';
    const isOffline = !powerState || powerState === 'offline';

    useEffect(() => {
        if (powerState === 'offline') {
            setIsKillConfirmOpen(false);
        }
    }, [powerState]);

    const sendAction = (action: PowerAction) => socket?.send(SocketRequest.SET_STATE, action);

    const handleStop = () => {
        if (isKillable) {
            setIsKillConfirmOpen(true);
            return;
        }

        sendAction('stop');
    };

    const handleKill = () => {
        sendAction('kill');
        setIsKillConfirmOpen(false);
    };

    return (
        <div className='flex items-center gap-2'>
            {hasPermission(permissions, 'control.start') && (
                <Button size='sm' disabled={!socket || powerState !== 'offline'} onClick={() => sendAction('start')}>
                    <PlayIcon />
                    Start
                </Button>
            )}
            {hasPermission(permissions, 'control.restart') && (
                <Button size='sm' variant='outline' disabled={!socket || isOffline} onClick={() => sendAction('restart')}>
                    <RotateCwIcon />
                    Restart
                </Button>
            )}
            {hasPermission(permissions, 'control.stop') && (
                <Button size='sm' variant='destructive' disabled={!socket || isOffline} onClick={handleStop}>
                    <SquareIcon />
                    {isKillable ? 'Kill' : 'Stop'}
                </Button>
            )}
            <AlertDialog open={isKillConfirmOpen} onOpenChange={setIsKillConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Forcibly stop process</AlertDialogTitle>
                        <AlertDialogDescription>
                            Forcibly stopping a server can lead to data corruption.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant='destructive' onClick={handleKill}>
                            Kill server
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export { PowerButtons };
