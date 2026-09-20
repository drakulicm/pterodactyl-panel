import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { bytesToString } from '@/lib/format';
import { useUploadStore } from '@/stores/uploadStore';

const UploadStatus: React.FC = () => {
    const uploads = useUploadStore((state) => state.uploads);
    const cancelUpload = useUploadStore((state) => state.cancelUpload);
    const clearUploads = useUploadStore((state) => state.clearUploads);

    if (uploads.length === 0) {
        return null;
    }

    return (
        <div className='fixed right-4 bottom-4 z-40 flex w-80 flex-col gap-3 rounded-xl border bg-popover p-3 shadow-lg'>
            <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>
                    Uploading {uploads.length} {uploads.length === 1 ? 'file' : 'files'}
                </span>
                <Button variant='ghost' size='sm' onClick={clearUploads}>
                    Cancel all
                </Button>
            </div>
            <div className='flex max-h-60 flex-col gap-3 overflow-y-auto'>
                {uploads.map((upload) => (
                    <div key={upload.id} className='flex items-center gap-2'>
                        <div className='flex min-w-0 flex-1 flex-col gap-1'>
                            <div className='flex items-center justify-between gap-2 text-xs'>
                                <span className='truncate'>{upload.name}</span>
                                <span className='shrink-0 text-muted-foreground tabular-nums'>
                                    {bytesToString(upload.loaded)} / {bytesToString(upload.total)}
                                </span>
                            </div>
                            <Progress
                                value={upload.total > 0 ? (upload.loaded / upload.total) * 100 : 0}
                                indicatorClassName='transition-none'
                            />
                        </div>
                        <Button
                            variant='ghost'
                            size='icon-sm'
                            aria-label={`Cancel ${upload.name}`}
                            onClick={() => cancelUpload(upload.id)}
                        >
                            <XIcon />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export { UploadStatus };
