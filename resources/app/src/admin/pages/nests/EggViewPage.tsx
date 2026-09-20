import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { DownloadIcon, UploadIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    type AdminEgg,
    type AdminEggPayload,
    deleteEgg,
    type EggImportSource,
    eggNestLookupQueryOptions,
    eggQueryOptions,
    exportEgg,
    getEggServerCount,
    invalidateNests,
    nestEggsQueryOptions,
    nestsQueryOptions,
    reimportEgg,
    toDockerImagesText,
    toJsonText,
    updateEgg,
} from '@/admin/api/nests';
import { EggConfigurationForm, type EggFormValues } from '@/admin/components/nests/EggConfigurationForm';
import { EggInstallTab } from '@/admin/components/nests/EggInstallTab';
import { EggSourceFields } from '@/admin/components/nests/EggSourceFields';
import { EggVariablesTab } from '@/admin/components/nests/EggVariablesTab';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { httpErrorToHuman } from '@/lib/http';

const toFormValues = (egg: AdminEgg): EggFormValues => ({
    name: egg.name,
    description: egg.description ?? '',
    docker_images: toDockerImagesText(egg.docker_images),
    startup: egg.startup,
    features: (egg.features ?? []).join(', '),
    file_denylist: (egg.config.file_denylist ?? []).join('\n'),
    force_outgoing_ip: egg.force_outgoing_ip,
    config_from: egg.config.extends === null ? '' : String(egg.config.extends),
    config_stop: egg.config.stop ?? '',
    config_startup: toJsonText(egg.config.startup),
    config_logs: toJsonText(egg.config.logs),
    config_files: toJsonText(egg.config.files),
});

const UpdateFromSourceDialog: React.FC<{
    nestId: number;
    eggId: number;
}> = ({ nestId, eggId }) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [source, setSource] = useState<EggImportSource | null>(null);

    const reimport = useMutation({
        mutationFn: (selected: EggImportSource) => reimportEgg(nestId, eggId, selected),
        onSuccess: () => {
            toast.success('This Egg has been updated from the egg document provided.');
            invalidateNests(queryClient);
            setSource(null);
            setIsOpen(false);
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSource(null);
        }

        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button type='button' variant='outline'>
                        <UploadIcon />
                        Update from file or URL
                    </Button>
                }
            />
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle>Update egg from file or URL</DialogTitle>
                    <DialogDescription>
                        Replace this egg&apos;s settings with an exported egg document. This will not change any
                        existing startup strings or Docker images for existing servers.
                    </DialogDescription>
                </DialogHeader>
                <FieldGroup className='py-4'>
                    <FormError message={reimport.error ? httpErrorToHuman(reimport.error) : null} />
                    <EggSourceFields idPrefix='reimport-egg' onChange={setSource} />
                </FieldGroup>
                <DialogFooter>
                    <Button variant='outline' onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant='destructive'
                        disabled={!source || reimport.isPending}
                        onClick={() => source && reimport.mutate(source)}
                    >
                        {reimport.isPending && <Spinner />}
                        Update egg
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EggViewPage: React.FC = () => {
    const { eggId } = useParams({ from: '/admin/nests/egg/$eggId' });
    const { tab } = useSearch({ from: '/admin/nests/egg/$eggId' });
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const lookup = useQuery(eggNestLookupQueryOptions);
    const nestId = lookup.data?.[Number(eggId)];

    const nests = useQuery({ ...nestsQueryOptions({ page: 1 }), enabled: nestId !== undefined });
    const egg = useQuery({ ...eggQueryOptions(nestId, eggId), enabled: nestId !== undefined });
    const eggs = useQuery({ ...nestEggsQueryOptions(nestId), enabled: nestId !== undefined });

    const attributes = egg.data;
    const eggsInNest = eggs.data?.items ?? [];
    const current = eggsInNest.find((option) => option.id === Number(eggId));
    const serverCount = current ? getEggServerCount(current) : 0;
    const childCount = eggsInNest.filter(
        (option) => option.config.extends === Number(eggId) || option.script.extends === Number(eggId),
    ).length;

    const update = useMutation({
        mutationFn: (payload: AdminEggPayload) => updateEgg(Number(nestId), Number(eggId), payload),
        onSuccess: () => {
            toast.success('Egg configuration has been updated successfully.');

            return invalidateNests(queryClient);
        },
    });

    const remove = useMutation({
        mutationFn: () => deleteEgg(Number(nestId), Number(eggId)),
        onSuccess: () => {
            toast.success('Successfully deleted the requested egg from the Panel.');
            queryClient.invalidateQueries({
                predicate: (query) => {
                    const path = String(query.queryKey[1] ?? '');

                    return (
                        query.queryKey[0] === 'admin' &&
                        path.startsWith('/nests') &&
                        !path.startsWith(`/nests/${nestId}/eggs/${eggId}`)
                    );
                },
            });
            navigate({ to: '/admin/nests/view/$nestId', params: { nestId: String(nestId) } });
        },
        onError: (error) => toast.error(httpErrorToHuman(error)),
    });

    const handleTabChange = (value: string) =>
        navigate({
            to: '/admin/nests/egg/$eggId',
            params: { eggId },
            search: { tab: value as 'configuration' | 'variables' | 'install' },
        });

    const handleExport = () =>
        attributes &&
        nestId !== undefined &&
        exportEgg(nestId, Number(eggId), attributes.name).catch((error) => toast.error(httpErrorToHuman(error)));

    return (
        <>
            <PageHeader title={attributes ? `Egg: ${attributes.name}` : 'Egg'}>
                <Button size='sm' variant='outline' render={<Link to='/admin/nests' />}>
                    Back
                </Button>
                {nestId !== undefined && (
                    <Button
                        size='sm'
                        variant='outline'
                        render={<Link to='/admin/nests/view/$nestId' params={{ nestId: String(nestId) }} />}
                    >
                        Nest
                    </Button>
                )}
            </PageHeader>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 p-4'>
                <FormError message={egg.error ? httpErrorToHuman(egg.error) : null} />
                <FormError message={lookup.error ? httpErrorToHuman(lookup.error) : null} />
                {(lookup.isPending || egg.isPending) && <Skeleton className='h-96 rounded-xl' />}
                {lookup.isSuccess && nestId === undefined && (
                    <p className='text-sm text-muted-foreground'>This egg could not be found.</p>
                )}
                {attributes && nestId !== undefined && (
                    <Tabs value={tab} onValueChange={(value) => handleTabChange(String(value))}>
                        <TabsList>
                            <TabsTrigger value='configuration'>Configuration</TabsTrigger>
                            <TabsTrigger value='variables'>Variables</TabsTrigger>
                            <TabsTrigger value='install'>Install script</TabsTrigger>
                        </TabsList>
                        <TabsContent value='configuration'>
                            <EggConfigurationForm
                                mode='edit'
                                defaultValues={toFormValues(attributes)}
                                nests={nests.data?.items ?? []}
                                nestId={nestId}
                                eggsInNest={eggsInNest}
                                egg={attributes}
                                isPending={update.isPending}
                                error={update.error}
                                onSubmit={(payload) => update.mutate(payload)}
                                footer={
                                    <>
                                        <Button type='button' variant='outline' onClick={handleExport}>
                                            <DownloadIcon />
                                            Export
                                        </Button>
                                        <UpdateFromSourceDialog nestId={nestId} eggId={Number(eggId)} />
                                        <AlertDialog>
                                            <AlertDialogTrigger
                                                render={
                                                    <Button
                                                        type='button'
                                                        variant='destructive'
                                                        disabled={serverCount > 0 || childCount > 0 || remove.isPending}
                                                    />
                                                }
                                            >
                                                Delete egg
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete {attributes.name}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {serverCount > 0
                                                            ? 'An Egg with active servers attached to it cannot be deleted from the Panel.'
                                                            : childCount > 0
                                                              ? 'This Egg is a parent to one or more other Eggs. Please delete those Eggs before deleting this Egg.'
                                                              : 'This egg and its variables will be permanently removed from the Panel. This action cannot be undone.'}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        variant='destructive'
                                                        onClick={() => remove.mutate()}
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                }
                            />
                        </TabsContent>
                        <TabsContent value='variables'>
                            <EggVariablesTab nestId={nestId} eggId={eggId} />
                        </TabsContent>
                        <TabsContent value='install'>
                            <EggInstallTab nestId={nestId} egg={attributes} eggsInNest={eggsInNest} />
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </>
    );
};

export { EggViewPage };
