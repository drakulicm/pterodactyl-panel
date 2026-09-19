import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import {
    ArchiveIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    FilePlusIcon,
    FolderOpenIcon,
    FolderPlusIcon,
    LinkIcon,
    SearchIcon,
    Trash2Icon,
    UploadIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useFileActions } from '@/hooks/useFileActions';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useServer } from '@/hooks/useServer';
import { httpErrorToHuman } from '@/lib/http';
import { hashToPath, pathToHash } from '@/lib/paths';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type SortColumn = 'name' | 'size' | 'modified';

interface SortState {
    column: SortColumn;
    direction: 'asc' | 'desc';
}

const compareFiles = (a: FileObject, b: FileObject, column: SortColumn): number => {
    if (column === 'size') {
        return a.size - b.size;
    }

    if (column === 'modified') {
        return a.modifiedAt.getTime() - b.modifiedAt.getTime();
    }

    return a.name.localeCompare(b.name);
};

const sortFiles = (files: FileObject[], sort: SortState): FileObject[] =>
    [...files].sort(
        (a, b) =>
            Number(a.isFile) - Number(b.isFile) ||
            compareFiles(a, b, sort.column) * (sort.direction === 'asc' ? 1 : -1),
    );

const SortHeader: React.FC<{
    column: SortColumn;
    label: string;
    sort: SortState;
    className?: string;
    onSortChange: (column: SortColumn) => void;
}> = ({ column, label, sort, className, onSortChange }) => {
    return (
        <Button
            variant='ghost'
            className={cn(
                'h-6 gap-1 rounded-none px-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground',
                className,
            )}
            onClick={() => onSortChange(column)}
        >
            {label}
            {sort.column === column &&
                (sort.direction === 'asc' ? (
                    <ChevronUpIcon className='size-3' />
                ) : (
                    <ChevronDownIcon className='size-3' />
                ))}
        </Button>
    );
};

const ServerFilesPage: React.FC = () => {
    const { server, permissions } = useServer();
    const hash = useLocation({ select: (location) => location.hash });
    const directory = hashToPath(hash);
    const [selected, setSelected] = useState<string[]>([]);
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState<SortState>({ column: 'name', direction: 'asc' });
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
    const query = filter.trim().toLowerCase();
    const files = useMemo(() => {
        const matches = data ? data.filter((file) => file.name.toLowerCase().includes(query)) : [];

        return sortFiles(matches, sort);
    }, [data, query, sort]);
    const selectedNames = useMemo(() => new Set(selected), [selected]);

    useEffect(() => {
        setFilter('');
    }, [directory]);

    useEffect(() => {
        setSelected([]);
    }, [directory, query]);

    const handleClose = () => setDialog(null);

    const handleSortChange = (column: SortColumn) => {
        setSort((previous) =>
            previous.column === column
                ? { column, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
                : { column, direction: 'asc' },
        );
    };

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
                <div className='flex min-h-8 flex-wrap items-center gap-2'>
                    <FileBreadcrumbs directory={directory} />
                    {!!data?.length && (
                        <InputGroup className='ml-auto w-full sm:w-56'>
                            <InputGroupInput
                                placeholder='Filter this directory...'
                                value={filter}
                                onChange={(event) => setFilter(event.target.value)}
                            />
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                        </InputGroup>
                    )}
                    {selected.length > 0 && (
                        <div className='flex flex-wrap items-center gap-2'>
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
                                checked={files.length > 0 && selected.length === files.length}
                                indeterminate={selected.length > 0 && selected.length < files.length}
                                onCheckedChange={(checked) => setSelected(checked === true ? files.map((file) => file.name) : [])}
                            />
                            <SortHeader
                                column='name'
                                label='Name'
                                sort={sort}
                                className='flex-1 justify-start'
                                onSortChange={handleSortChange}
                            />
                            <SortHeader
                                column='size'
                                label='Size'
                                sort={sort}
                                className='hidden w-24 justify-end sm:inline-flex'
                                onSortChange={handleSortChange}
                            />
                            <SortHeader
                                column='modified'
                                label='Modified'
                                sort={sort}
                                className='hidden w-36 justify-end md:inline-flex'
                                onSortChange={handleSortChange}
                            />
                            <span className='w-7' />
                        </div>
                        {files.map((file) => (
                            <FileRow
                                key={file.key}
                                file={file}
                                directory={directory}
                                isSelected={selectedNames.has(file.name)}
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
                                <EmptyTitle>{query ? 'Nothing matches that filter' : 'This directory is empty'}</EmptyTitle>
                                <EmptyDescription>
                                    {query
                                        ? 'No file or directory here matches what you typed.'
                                        : 'Drop files here or use the buttons above to add some.'}
                                </EmptyDescription>
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
