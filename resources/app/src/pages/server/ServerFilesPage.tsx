import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { ArchiveIcon, FilePlusIcon, FolderOpenIcon, FolderPlusIcon, LinkIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { directoryQueryOptions, type FileObject } from '@/api/server/files';
import { FormError } from '@/components/auth/FormError';
import { PageHeader } from '@/components/layout/PageHeader';
import { FileBreadcrumbs } from '@/components/server/files/FileBreadcrumbs';
import {
    DeleteFilesDialog,
    type FileDialogState,
    InputDialog,
    moveHint,
} from '@/components/server/files/FileDialogs';
import { FileRow } from '@/components/server/files/FileRow';
import { UploadStatus } from '@/components/server/files/UploadStatus';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useFileActions } from '@/hooks/useFileActions';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hashToPath, pathToHash } from '@/lib/paths';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const sortFiles = (files: FileObject[]): FileObject[] =>
    [...files].sort((a, b) => Number(a.isFile) - Number(b.isFile) || a.name.localeCompare(b.name));

const ServerFilesPage: React.FC = () => {
    const { server, permissions } = useServer();
    const hash = useLocation({ select: (location) => location.hash });
    const directory = hashToPath(hash);
    const [selected, setSelected] = useState<string[]>([]);
    const [dialog, setDialog] = useState<FileDialogState>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const { data, error, isPending } = useQuery(directoryQueryOptions(server.uuid, directory));
    const actions = useFileActions(server.uuid, directory);
    const upload = useFileUpload(server.uuid, directory);

    const canCreate = hasPermission(permissions, 'file.create');
    const canUpdate = hasPermission(permissions, 'file.update');
    const canArchive = hasPermission(permissions, 'file.archive');
    const canDelete = hasPermission(permissions, 'file.delete');
    const files = data ? sortFiles(data) : [];

    useEffect(() => {
        setSelected([]);
    }, [directory]);

    const handleClose = () => setDialog(null);

    const handleSelectedChange = (name: string, isSelected: boolean) => {
        setSelected((previous) => (isSelected ? [...previous, name] : previous.filter((item) => item !== name)));
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        if (canCreate && event.dataTransfer.files.length > 0) {
            upload(Array.from(event.dataTransfer.files));
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        if (!canCreate || !event.dataTransfer.types.includes('Files')) {
            return;
        }

        event.preventDefault();
        setIsDragging(true);
    };

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        upload(Array.from(event.target.files ?? []));
        event.target.value = '';
    };

    return (
        <>
            <PageHeader title='Files'>
                {canCreate && (
                    <>
                        <Button size='sm' variant='outline' onClick={() => setDialog({ type: 'new-directory' })}>
                            <FolderPlusIcon />
                            <span className='sr-only md:not-sr-only'>New folder</span>
                        </Button>
                        <Button size='sm' variant='outline' onClick={() => setDialog({ type: 'pull' })}>
                            <LinkIcon />
                            <span className='sr-only md:not-sr-only'>From URL</span>
                        </Button>
                        <Button size='sm' variant='outline' onClick={() => fileInput.current?.click()}>
                            <UploadIcon />
                            <span className='sr-only md:not-sr-only'>Upload</span>
                        </Button>
                        <Button
                            size='sm'
                            render={
                                <Link to='/server/$id/files/new' params={{ id: server.id }} hash={pathToHash(directory)} />
                            }
                        >
                            <FilePlusIcon />
                            <span className='sr-only md:not-sr-only'>New file</span>
                        </Button>
                        <input ref={fileInput} type='file' multiple className='hidden' onChange={handleFileInputChange} />
                    </>
                )}
            </PageHeader>
            <div
                className='relative flex flex-1 flex-col gap-4 p-4'
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <div className='flex min-h-8 flex-wrap items-center justify-between gap-2'>
                    <FileBreadcrumbs directory={directory} />
                    {selected.length > 0 && (
                        <div className='flex items-center gap-2'>
                            <span className='text-xs text-muted-foreground'>{selected.length} selected</span>
                            {canUpdate && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => setDialog({ type: 'mass-move', names: selected })}
                                >
                                    <FolderOpenIcon />
                                    Move
                                </Button>
                            )}
                            {canArchive && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    disabled={actions.compress.isPending}
                                    onClick={() => actions.compress.mutate(selected, { onSuccess: () => setSelected([]) })}
                                >
                                    <ArchiveIcon />
                                    Archive
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    size='sm'
                                    variant='destructive'
                                    onClick={() => setDialog({ type: 'delete', names: selected })}
                                >
                                    <Trash2Icon />
                                    Delete
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <FormError message={error ? httpErrorToHuman(error) : null} />
                {isPending ? (
                    <Skeleton className='h-64 rounded-xl' />
                ) : files.length > 0 ? (
                    <div className='overflow-hidden rounded-xl border bg-card'>
                        <div className='flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground'>
                            <Checkbox
                                aria-label='Select all files'
                                checked={selected.length === files.length}
                                indeterminate={selected.length > 0 && selected.length < files.length}
                                onCheckedChange={(checked) => setSelected(checked === true ? files.map((file) => file.name) : [])}
                            />
                            <span className='flex-1'>Name</span>
                            <span className='hidden w-24 text-right sm:block'>Size</span>
                            <span className='hidden w-36 text-right md:block'>Modified</span>
                            <span className='w-7' />
                        </div>
                        {files.map((file) => (
                            <FileRow
                                key={file.key}
                                file={file}
                                directory={directory}
                                isSelected={selected.includes(file.name)}
                                actions={actions}
                                onSelectedChange={(isSelected) => handleSelectedChange(file.name, isSelected)}
                                onDialog={setDialog}
                            />
                        ))}
                    </div>
                ) : (
                    !error && (
                        <Empty className='border'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon'>
                                    <FolderOpenIcon />
                                </EmptyMedia>
                                <EmptyTitle>This directory is empty</EmptyTitle>
                                <EmptyDescription>Drop files here or use the buttons above to add some.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                )}
                <div
                    className={cn(
                        'pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/80 text-sm font-medium opacity-0 transition-opacity duration-200 ease-out',
                        isDragging && 'opacity-100',
                    )}
                >
                    Drop files to upload to {directory}
                </div>
            </div>
            <UploadStatus />
            <InputDialog
                isOpen={dialog?.type === 'new-directory'}
                title='Create directory'
                label='Directory name'
                initialValue=''
                hint={(value) => moveHint(directory)(value).replace('New location', 'This directory will be created as')}
                submitLabel='Create'
                isPending={actions.makeDirectory.isPending}
                onSubmit={(value) => actions.makeDirectory.mutate(value, { onSuccess: handleClose })}
                onClose={handleClose}
            />
            <InputDialog
                isOpen={dialog?.type === 'pull'}
                title='Download from URL'
                description='The server downloads the file directly into the current directory.'
                label='URL'
                initialValue=''
                secondaryLabel='File name (optional)'
                submitLabel='Download'
                isPending={actions.pull.isPending}
                onSubmit={(url, filename) => actions.pull.mutate({ url, filename }, { onSuccess: handleClose })}
                onClose={handleClose}
            />
            <InputDialog
                isOpen={dialog?.type === 'rename' || dialog?.type === 'move'}
                title={dialog?.type === 'move' ? 'Move file' : 'Rename file'}
                label={dialog?.type === 'move' ? 'New location' : 'File name'}
                initialValue={dialog?.type === 'rename' || dialog?.type === 'move' ? dialog.file.name : ''}
                hint={dialog?.type === 'move' ? moveHint(directory) : undefined}
                submitLabel={dialog?.type === 'move' ? 'Move' : 'Rename'}
                isPending={actions.rename.isPending}
                onSubmit={(value) => {
                    if (dialog?.type !== 'rename' && dialog?.type !== 'move') {
                        return;
                    }

                    actions.rename.mutate([{ from: dialog.file.name, to: value }], { onSuccess: handleClose });
                }}
                onClose={handleClose}
            />
            <InputDialog
                isOpen={dialog?.type === 'mass-move'}
                title='Move files'
                label='Directory'
                initialValue=''
                hint={moveHint(directory)}
                submitLabel='Move'
                isPending={actions.rename.isPending}
                onSubmit={(value) => {
                    if (dialog?.type !== 'mass-move') {
                        return;
                    }

                    actions.rename.mutate(
                        dialog.names.map((name) => ({ from: name, to: `${value}/${name}` })),
                        {
                            onSuccess: () => {
                                setSelected([]);
                                handleClose();
                            },
                        },
                    );
                }}
                onClose={handleClose}
            />
            <InputDialog
                isOpen={dialog?.type === 'chmod'}
                title='Configure permissions'
                label='File mode'
                initialValue={dialog?.type === 'chmod' ? dialog.file.modeBits : ''}
                submitLabel='Update'
                isPending={actions.chmod.isPending}
                onSubmit={(value) => {
                    if (dialog?.type !== 'chmod') {
                        return;
                    }

                    actions.chmod.mutate([{ file: dialog.file.name, mode: value }], { onSuccess: handleClose });
                }}
                onClose={handleClose}
            />
            <DeleteFilesDialog
                isOpen={dialog?.type === 'delete'}
                names={dialog?.type === 'delete' ? dialog.names : []}
                onConfirm={() => {
                    if (dialog?.type !== 'delete') {
                        return;
                    }

                    actions.remove.mutate(dialog.names, { onSuccess: () => setSelected([]) });
                    handleClose();
                }}
                onClose={handleClose}
            />
        </>
    );
};

export { ServerFilesPage };
