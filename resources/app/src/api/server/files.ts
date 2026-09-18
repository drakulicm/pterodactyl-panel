import { queryOptions } from '@tanstack/react-query';

import type { Raw } from '@/api/server/transformers';
import { http } from '@/lib/http';

interface FileObject {
    key: string;
    name: string;
    mode: string;
    modeBits: string;
    size: number;
    isFile: boolean;
    isSymlink: boolean;
    mimetype: string;
    createdAt: Date;
    modifiedAt: Date;
}

const ARCHIVE_MIMETYPES = [
    'application/vnd.rar',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/x-br',
    'application/x-bzip2',
    'application/gzip',
    'application/x-gzip',
    'application/x-lzip',
    'application/x-sz',
    'application/x-xz',
    'application/zstd',
    'application/zip',
    'application/x-7z-compressed',
];

const NON_EDITABLE_MIMETYPES = ['application/jar', 'application/octet-stream', 'inode/directory', /^image\/(?!svg\+xml)/];

const isArchive = (file: FileObject): boolean => file.isFile && ARCHIVE_MIMETYPES.includes(file.mimetype);

const isEditable = (file: FileObject): boolean =>
    file.isFile && !isArchive(file) && NON_EDITABLE_MIMETYPES.every((match) => !file.mimetype.match(match));

const toFileObject = ({ attributes }: Raw): FileObject => ({
    key: `${attributes.is_file ? 'file' : 'dir'}_${attributes.name}`,
    name: attributes.name,
    mode: attributes.mode,
    modeBits: attributes.mode_bits,
    size: Number(attributes.size),
    isFile: attributes.is_file,
    isSymlink: attributes.is_symlink,
    mimetype: attributes.mimetype,
    createdAt: new Date(attributes.created_at),
    modifiedAt: new Date(attributes.modified_at),
});

const base = (uuid: string) => `/api/client/servers/${uuid}/files`;

const loadDirectory = async (uuid: string, directory: string): Promise<FileObject[]> => {
    const { data } = await http.get(`${base(uuid)}/list`, { params: { directory } });

    return ((data.data ?? []) as Raw[]).map(toFileObject);
};

const getFileContents = async (uuid: string, file: string): Promise<string> => {
    const { data } = await http.get(`${base(uuid)}/contents`, {
        params: { file },
        transformResponse: (response) => response,
        responseType: 'text',
    });

    return data;
};

const saveFileContents = async (uuid: string, file: string, content: string): Promise<void> => {
    await http.post(`${base(uuid)}/write`, content, {
        params: { file },
        headers: { 'Content-Type': 'text/plain' },
    });
};

const getFileDownloadUrl = async (uuid: string, file: string): Promise<string> => {
    const { data } = await http.get(`${base(uuid)}/download`, { params: { file } });

    return data.attributes.url;
};

const getFileUploadUrl = async (uuid: string): Promise<string> => {
    const { data } = await http.get(`${base(uuid)}/upload`);

    return data.attributes.url;
};

const renameFiles = async (uuid: string, root: string, files: { from: string; to: string }[]): Promise<void> => {
    await http.put(`${base(uuid)}/rename`, { root, files });
};

const copyFile = async (uuid: string, location: string): Promise<void> => {
    await http.post(`${base(uuid)}/copy`, { location });
};

const deleteFiles = async (uuid: string, root: string, files: string[]): Promise<void> => {
    await http.post(`${base(uuid)}/delete`, { root, files });
};

const createDirectory = async (uuid: string, root: string, name: string): Promise<void> => {
    await http.post(`${base(uuid)}/create-folder`, { root, name });
};

const compressFiles = async (uuid: string, root: string, files: string[]): Promise<void> => {
    await http.post(
        `${base(uuid)}/compress`,
        { root, files },
        {
            timeout: 60000,
            timeoutErrorMessage:
                'It looks like this archive is taking a long time to generate. It will appear once completed.',
        },
    );
};

const decompressFile = async (uuid: string, root: string, file: string): Promise<void> => {
    await http.post(
        `${base(uuid)}/decompress`,
        { root, file },
        {
            timeout: 300000,
            timeoutErrorMessage:
                'It looks like this archive is taking a long time to be unarchived. Once completed the unarchived files will appear.',
        },
    );
};

const chmodFiles = async (uuid: string, root: string, files: { file: string; mode: string }[]): Promise<void> => {
    await http.post(`${base(uuid)}/chmod`, { root, files });
};

const pullFile = async (uuid: string, data: { url: string; directory: string; filename?: string }): Promise<void> => {
    await http.post(`${base(uuid)}/pull`, {
        url: data.url,
        directory: data.directory,
        filename: data.filename || undefined,
    });
};

const directoryQueryOptions = (uuid: string, directory: string) =>
    queryOptions({
        queryKey: ['server', uuid, 'files', directory],
        queryFn: () => loadDirectory(uuid, directory),
    });

const fileContentsQueryOptions = (uuid: string, file: string) =>
    queryOptions({
        queryKey: ['server', uuid, 'file-contents', file],
        queryFn: () => getFileContents(uuid, file),
        staleTime: 0,
        gcTime: 0,
    });

export {
    chmodFiles,
    compressFiles,
    copyFile,
    createDirectory,
    decompressFile,
    deleteFiles,
    directoryQueryOptions,
    fileContentsQueryOptions,
    getFileDownloadUrl,
    getFileUploadUrl,
    isArchive,
    isEditable,
    pullFile,
    renameFiles,
    saveFileContents,
};
export type { FileObject };
