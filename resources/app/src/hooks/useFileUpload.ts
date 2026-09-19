import { useQueryClient } from '@tanstack/react-query';
import axios, { isCancel } from 'axios';
import { toast } from 'sonner';

import { getFileUploadUrl } from '@/api/server/files';
import { httpErrorToHuman } from '@/lib/http';
import { useUploadStore } from '@/stores/uploadStore';

const UPLOAD_CONCURRENCY = 3;
const PROGRESS_INTERVAL = 100;

const runPool = async (tasks: (() => Promise<void>)[], limit: number): Promise<void> => {
    let cursor = 0;

    const worker = async (): Promise<void> => {
        while (cursor < tasks.length) {
            const task = tasks[cursor];
            cursor += 1;
            await task?.();
        }
    };

    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
};

const useFileUpload = (uuid: string, directory: string): ((files: File[]) => void) => {
    const queryClient = useQueryClient();

    return (files: File[]) => {
        const { addUpload, setProgress, removeUpload } = useUploadStore.getState();
        const uploadable = files.filter((file) => file.type || file.size !== 4096);

        if (uploadable.length !== files.length) {
            toast.error('Folder uploads are not supported.');
        }

        if (uploadable.length === 0) {
            return;
        }

        const entries = uploadable.map((file) => ({
            file,
            id: crypto.randomUUID(),
            controller: new AbortController(),
        }));

        entries.forEach(({ id, file, controller }) =>
            addUpload({ id, name: file.name, loaded: 0, total: file.size, controller }),
        );

        const run = async () => {
            let url: string;

            try {
                url = await getFileUploadUrl(uuid);
            } catch (error) {
                entries.forEach(({ id }) => removeUpload(id));
                toast.error(httpErrorToHuman(error));

                return;
            }

            const tasks = entries.map(({ id, file, controller }) => async () => {
                if (controller.signal.aborted) {
                    removeUpload(id);

                    return;
                }

                let reportedAt = 0;

                try {
                    await axios.post(
                        url,
                        { files: file },
                        {
                            signal: controller.signal,
                            headers: { 'Content-Type': 'multipart/form-data' },
                            params: { directory },
                            onUploadProgress: (progress) => {
                                const now = Date.now();
                                const isComplete = progress.total !== undefined && progress.loaded >= progress.total;

                                if (!isComplete && now - reportedAt < PROGRESS_INTERVAL) {
                                    return;
                                }

                                reportedAt = now;
                                setProgress(id, progress.loaded);
                            },
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

            await runPool(tasks, UPLOAD_CONCURRENCY);
            queryClient.invalidateQueries({ queryKey: ['server', uuid, 'files', directory] });
        };

        run();
    };
};

export { useFileUpload };
