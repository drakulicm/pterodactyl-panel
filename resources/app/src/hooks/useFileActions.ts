import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
    chmodFiles,
    compressFiles,
    copyFile,
    createDirectory,
    decompressFile,
    deleteFiles,
    getFileDownloadUrl,
    pullFile,
    renameFiles,
} from '@/api/server/files';
import { httpErrorToHuman } from '@/lib/http';
import { joinPath } from '@/lib/paths';

const useFileActions = (uuid: string, directory: string) => {
    const queryClient = useQueryClient();

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['server', uuid, 'files'] });
    const handleError = (error: unknown) => toast.error(httpErrorToHuman(error));
    const countFiles = (count: number): string => `${count} ${count === 1 ? 'file' : 'files'}`;

    const succeed = (message: string) => {
        invalidate();
        toast.success(message);
    };

    const rename = useMutation({
        mutationFn: (files: { from: string; to: string }[]) => renameFiles(uuid, directory, files),
        onSuccess: (_, files) => succeed(files.length === 1 ? 'File moved.' : `Moved ${countFiles(files.length)}.`),
        onError: handleError,
    });

    const copy = useMutation({
        mutationFn: (name: string) => copyFile(uuid, joinPath(directory, name)),
        onSuccess: () => succeed('File copied.'),
        onError: handleError,
    });

    const remove = useMutation({
        mutationFn: (names: string[]) => deleteFiles(uuid, directory, names),
        onSuccess: (_, names) => succeed(`Deleted ${countFiles(names.length)}.`),
        onError: handleError,
    });

    const makeDirectory = useMutation({
        mutationFn: (name: string) => createDirectory(uuid, directory, name),
        onSuccess: () => succeed('Directory created.'),
        onError: handleError,
    });

    const compress = useMutation({
        mutationFn: (names: string[]) => compressFiles(uuid, directory, names),
        onSuccess: () => succeed('Archive created.'),
        onError: handleError,
    });

    const decompress = useMutation({
        mutationFn: (name: string) => decompressFile(uuid, directory, name),
        onSuccess: () => succeed('Archive extracted.'),
        onError: handleError,
    });

    const chmod = useMutation({
        mutationFn: (files: { file: string; mode: string }[]) => chmodFiles(uuid, directory, files),
        onSuccess: () => succeed('Permissions updated.'),
        onError: handleError,
    });

    const pull = useMutation({
        mutationFn: (data: { url: string; filename?: string }) => pullFile(uuid, { ...data, directory }),
        onSuccess: () => {
            invalidate();
            toast.info('The download has been queued. Refresh this directory once it has finished.');
        },
        onError: handleError,
    });

    const download = useMutation({
        mutationFn: (name: string) => getFileDownloadUrl(uuid, joinPath(directory, name)),
        onSuccess: (url) => {
            window.location.href = url;
        },
        onError: handleError,
    });

    return { rename, copy, remove, makeDirectory, compress, decompress, chmod, pull, download };
};

export { useFileActions };
