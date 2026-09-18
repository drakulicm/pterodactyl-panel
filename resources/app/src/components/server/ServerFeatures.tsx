import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { saveFileContents } from '@/api/server/files';
import { serverQueryOptions } from '@/api/server/server';
import { serverStartupQueryOptions, setSelectedDockerImage, updateStartupVariable } from '@/api/server/startup';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useServer } from '@/hooks/useServer';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { httpErrorToHuman } from '@/lib/http';
import { hasPermission } from '@/lib/permissions';
import { SocketEvent, SocketRequest } from '@/lib/socketEvents';
import { useServerStore } from '@/stores/serverStore';

type FeatureKey = 'eula' | 'java_version' | 'gsl_token' | 'pid_limit' | 'steam_disk_space' | 'hytale_oauth';

const HYTALE_PATTERN = /https:\/\/oauth\.accounts\.hytale\.com\/oauth2\/device\/verify\?user_code=(\S*)/i;

const FEATURE_MATCHERS: Record<Exclude<FeatureKey, 'hytale_oauth'>, string[]> = {
    eula: ['you need to agree to the eula in order to run the server'],
    java_version: [
        'minecraft 1.17 requires running the server with java 16 or above',
        'minecraft 1.18 requires running the server with java 17 or above',
        'java.lang.unsupportedclassversionerror',
        'unsupported major.minor version',
        'has been compiled by a more recent version of the java runtime',
    ],
    gsl_token: ['(gsl token expired)', '(account not found)'],
    pid_limit: [
        'pthread_create failed',
        'failed to create thread',
        'unable to create thread',
        'unable to create native thread',
        'unable to create new native thread',
        'exception in thread "craft async scheduler management thread"',
    ],
    steam_disk_space: ['steamcmd needs 250mb of free disk space to update', '0x202 after update job'],
};

const ServerFeatures: React.FC = () => {
    const queryClient = useQueryClient();
    const { server, permissions } = useServer();
    const socket = useServerStore((state) => state.socket);
    const powerState = useServerStore((state) => state.powerState);
    const [active, setActive] = useState<FeatureKey | null>(null);
    const [hytaleUrl, setHytaleUrl] = useState('');
    const [gslToken, setGslToken] = useState('');
    const [dockerImage, setDockerImage] = useState<string | null>(null);
    const enabled = server.eggFeatures.map((feature) => feature.toLowerCase());
    const canChangeImage = hasPermission(permissions, 'startup.docker-image');

    const startup = useQuery({
        ...serverStartupQueryOptions(server.uuid),
        enabled: active === 'java_version' && canChangeImage,
    });

    useSocketEvent(SocketEvent.CONSOLE_OUTPUT, (line) => {
        if (active || powerState === 'running') {
            return;
        }

        const hytale = enabled.includes('hytale_oauth') ? line.match(HYTALE_PATTERN) : null;
        if (hytale) {
            setHytaleUrl(hytale[0]);
            setActive('hytale_oauth');
            return;
        }

        const normalized = line.toLowerCase();
        const match = (Object.keys(FEATURE_MATCHERS) as (keyof typeof FEATURE_MATCHERS)[]).find(
            (key) => enabled.includes(key) && FEATURE_MATCHERS[key].some((value) => normalized.includes(value)),
        );

        if (match) {
            setActive(match);
        }
    });

    const handleClose = () => setActive(null);

    const restart = () => {
        socket?.send(SocketRequest.SET_STATE, powerState === 'offline' || !powerState ? 'start' : 'restart');
        handleClose();
    };

    const acceptEula = useMutation({
        mutationFn: () => saveFileContents(server.uuid, 'eula.txt', 'eula=true'),
        onSuccess: restart,
    });

    const updateImage = useMutation({
        mutationFn: (image: string) => setSelectedDockerImage(server.uuid, image),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serverQueryOptions(server.id).queryKey });
            restart();
        },
    });

    const updateToken = useMutation({
        mutationFn: () => updateStartupVariable(server.uuid, 'STEAM_ACC', gslToken),
        onSuccess: restart,
    });

    const error = acceptEula.error ?? updateImage.error ?? updateToken.error;
    const images = Object.entries(startup.data?.dockerImages ?? {});

    return (
        <Dialog open={active !== null} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent showCloseButton={false}>
                {active === 'eula' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Accept Minecraft EULA</DialogTitle>
                            <DialogDescription>
                                By pressing &quot;I accept&quot; you are indicating your agreement to the{' '}
                                <a
                                    href='https://www.minecraft.net/eula'
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='underline underline-offset-4'
                                >
                                    Minecraft EULA
                                </a>
                                .
                            </DialogDescription>
                        </DialogHeader>
                        <FormError message={error ? httpErrorToHuman(error) : null} />
                        <DialogFooter>
                            <Button variant='outline' onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button disabled={acceptEula.isPending} onClick={() => acceptEula.mutate()}>
                                {acceptEula.isPending && <Spinner />}I accept
                            </Button>
                        </DialogFooter>
                    </>
                )}
                {active === 'java_version' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Unsupported Java version</DialogTitle>
                            <DialogDescription>
                                This server is running a Java version that does not support the installed software.
                                {canChangeImage
                                    ? ' Select a supported version below and restart the server.'
                                    : ' Contact an administrator to change the Docker image.'}
                            </DialogDescription>
                        </DialogHeader>
                        <FormError message={error ? httpErrorToHuman(error) : null} />
                        {canChangeImage && (
                            <Select value={dockerImage} onValueChange={(value) => setDockerImage(value as string)}>
                                <SelectTrigger className='w-full'>
                                    <SelectValue placeholder='Select a Java version' />
                                </SelectTrigger>
                                <SelectContent>
                                    {images.map(([name, image]) => (
                                        <SelectItem key={image} value={image}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <DialogFooter>
                            <Button variant='outline' onClick={handleClose}>
                                Cancel
                            </Button>
                            {canChangeImage && (
                                <Button
                                    disabled={!dockerImage || updateImage.isPending}
                                    onClick={() => dockerImage && updateImage.mutate(dockerImage)}
                                >
                                    {updateImage.isPending && <Spinner />}
                                    Update and restart
                                </Button>
                            )}
                        </DialogFooter>
                    </>
                )}
                {active === 'gsl_token' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Invalid GSL token</DialogTitle>
                            <DialogDescription>
                                The Gameserver Login Token being used appears to be invalid or has expired. Generate a
                                new one and enter it below.
                            </DialogDescription>
                        </DialogHeader>
                        <FieldGroup>
                            <FormError message={error ? httpErrorToHuman(error) : null} />
                            <Field>
                                <FieldLabel htmlFor='gsl-token'>GSL Token</FieldLabel>
                                <Input
                                    id='gsl-token'
                                    autoComplete='off'
                                    value={gslToken}
                                    onChange={(event) => setGslToken(event.target.value)}
                                />
                            </Field>
                        </FieldGroup>
                        <DialogFooter>
                            <Button variant='outline' onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                disabled={gslToken.length === 0 || updateToken.isPending}
                                onClick={() => updateToken.mutate()}
                            >
                                {updateToken.isPending && <Spinner />}
                                Update GSL token
                            </Button>
                        </DialogFooter>
                    </>
                )}
                {(active === 'pid_limit' || active === 'steam_disk_space' || active === 'hytale_oauth') && (
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                {active === 'pid_limit'
                                    ? 'Memory or process limit reached'
                                    : active === 'steam_disk_space'
                                      ? 'Out of available disk space'
                                      : 'Hytale authentication required'}
                            </DialogTitle>
                            <DialogDescription>
                                {active === 'pid_limit'
                                    ? 'This server has reached the maximum process, thread or memory limit. Try again shortly, and contact an administrator if the problem persists.'
                                    : active === 'steam_disk_space'
                                      ? 'This server has run out of available disk space and cannot complete the install or update process. Free up space by deleting files, or contact an administrator.'
                                      : 'This server needs to be linked to a Hytale account before it can start. Open the link below and approve the device.'}
                            </DialogDescription>
                        </DialogHeader>
                        {active === 'hytale_oauth' && (
                            <a
                                href={hytaleUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-sm break-all underline underline-offset-4'
                            >
                                {hytaleUrl}
                            </a>
                        )}
                        <DialogFooter>
                            <Button onClick={handleClose}>Close</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export { ServerFeatures };
