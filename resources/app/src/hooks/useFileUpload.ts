import { useQueryClient } from '@tanstack/react-query';
import axios, { isCancel } from 'axios';
import { toast } from 'sonner';

import { getFileUploadUrl } from '@/api/server/files';
import { httpErrorToHuman } from '@/lib/http';
import { useUploadStore } from '@/stores/uploadStore';

const useFileUpload = (uuid: string, directory: string): ((files: File[]) => void) => {
    const queryClient = useQueryClient();

    return (files: File[]) => {
        const { addUpload, setProgress, removeUpload } = useUploadStore.getState();
        const uploadable = files.filter((file) => file.type || file.size !== 4096);

        if (uploadable.length !== files.length) {
            toast.error('Folder uploads are not supported.');
        }

        const uploads = uploadable.map(async (file) => {
            const id = crypto.randomUUID();
            const controller = new AbortController();
            addUpload({ id, name: file.name, loaded: 0, total: file.size, controller });

            try {
                const url = await getFileUploadUrl(uuid);
                await axios.post(
                    url,
                    { files: file },
                    {
                        signal: controller.signal,
                        headers: { 'Content-Type': 'multipart/form-data' },
                        params: { directory },
                        onUploadProgress: (progress) => setProgress(id, progress.loaded),
                    },
                );
            } catch (error) {
                if (!isCancel(error)) {
                    toast.error(`${file.name}: ${httpErrorToHuman(error)}`);
                }
            } finally {
                removeUpload(id);
            }
        });

        Promise.allSettled(uploads).then(() =>
            queryClient.invalidateQueries({ queryKey: ['server', uuid, 'files', directory] }),
        );
    };
};

export { useFileUpload };
