import { Link } from '@tanstack/react-router';
import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
import {
    ArchiveIcon,
    ArchiveRestoreIcon,
    CopyIcon,
    DownloadIcon,
    FileCodeIcon,
    FileIcon,
    FileSymlinkIcon,
    FolderIcon,
    FolderInputIcon,
    KeyRoundIcon,
    MoreHorizontalIcon,
    PencilIcon,
    Trash2Icon,
} from 'lucide-react';

import { type FileObject, isArchive, isEditable } from '@/api/server/files';
import type { FileDialogState } from '@/components/server/files/FileDialogs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { useFileActions } from '@/hooks/useFileActions';
import { useServer } from '@/hooks/useServer';
import { bytesToString } from '@/lib/format';
import { joinPath, pathToHash } from '@/lib/paths';
import { hasPermission } from '@/lib/permissions';

const getIcon = (file: FileObject) => {
    if (!file.isFile) {
        return FolderIcon;
    }

    if (file.isSymlink) {
        return FileSymlinkIcon;
    }

    if (isArchive(file)) {
        return ArchiveIcon;
    }

    return isEditable(file) ? FileCodeIcon : FileIcon;
};

const FileRow: React.FC<{
    file: FileObject;
    directory: string;
    isSelected: boolean;
    actions: ReturnType<typeof useFileActions>;
    onSelectedChange: (isSelected: boolean) => void;
    onDialog: (state: FileDialogState) => void;
}> = ({ file, directory, isSelected, actions, onSelectedChange, onDialog }) => {
    const { server, permissions } = useServer();
    const Icon = getIcon(file);
    const path = joinPath(directory, file.name);
    const canUpdate = hasPermission(permissions, 'file.update');
    const canCreate = hasPermission(permissions, 'file.create');
    const canArchive = hasPermission(permissions, 'file.archive');
    const canDelete = hasPermission(permissions, 'file.delete');
    const canOpen = !file.isFile || (isEditable(file) && hasPermission(permissions, 'file.read-content'));

    const content = (
        <>
            <Icon className='size-4 shrink-0 text-muted-foreground' />
            <span className='min-w-0 flex-1 truncate text-sm'>{file.name}</span>
            {file.isFile && (
                <span className='hidden w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block'>
                    {bytesToString(file.size)}
                </span>
            )}
            <span
                className='hidden w-36 shrink-0 text-right text-xs text-muted-foreground md:block'
                title={file.modifiedAt.toString()}
            >
                {Math.abs(differenceInHours(file.modifiedAt, new Date())) > 48
                    ? format(file.modifiedAt, 'MMM do, yyyy h:mma')
                    : formatDistanceToNow(file.modifiedAt, { addSuffix: true })}
            </span>
        </>
    );

    return (
        <div className='group/file flex items-center gap-3 border-b px-3 transition-colors duration-200 last:border-b-0 hover:bg-muted/40'>
            <Checkbox
                aria-label={`Select ${file.name}`}
                checked={isSelected}
                onCheckedChange={(checked) => onSelectedChange(checked === true)}
            />
            {canOpen ? (
                <Link
                    to={file.isFile ? '/server/$id/files/edit' : '/server/$id/files'}
                    params={{ id: server.id }}
                    hash={pathToHash(path)}
                    className='flex min-w-0 flex-1 items-center gap-3 py-2.5 outline-none'
                >
                    {content}
                </Link>
            ) : (
                <div className='flex min-w-0 flex-1 items-center gap-3 py-2.5'>{content}</div>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={<Button variant='ghost' size='icon-sm' aria-label={`Actions for ${file.name}`} />}
                >
                    <MoreHorizontalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='min-w-44'>
                    <DropdownMenuGroup>
                        {canUpdate && (
                            <>
                                <DropdownMenuItem onClick={() => onDialog({ type: 'rename', file })}>
                                    <PencilIcon />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDialog({ type: 'move', file })}>
                                    <FolderInputIcon />
                                    Move
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDialog({ type: 'chmod', file })}>
                                    <KeyRoundIcon />
                                    Permissions
                                </DropdownMenuItem>
                            </>
                        )}
                        {file.isFile && canCreate && (
                            <DropdownMenuItem onClick={() => actions.copy.mutate(file.name)}>
                                <CopyIcon />
                                Copy
                            </DropdownMenuItem>
                        )}
                        {isArchive(file) && canCreate && (
                            <DropdownMenuItem onClick={() => actions.decompress.mutate(file.name)}>
                                <ArchiveRestoreIcon />
                                Unarchive
                            </DropdownMenuItem>
                        )}
                        {!isArchive(file) && canArchive && (
                            <DropdownMenuItem onClick={() => actions.compress.mutate([file.name])}>
                                <ArchiveIcon />
                                Archive
                            </DropdownMenuItem>
                        )}
                        {file.isFile && (
                            <DropdownMenuItem onClick={() => actions.download.mutate(file.name)}>
                                <DownloadIcon />
                                Download
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuGroup>
                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    variant='destructive'
                                    onClick={() => onDialog({ type: 'delete', names: [file.name] })}
                                >
                                    <Trash2Icon />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export { FileRow };
