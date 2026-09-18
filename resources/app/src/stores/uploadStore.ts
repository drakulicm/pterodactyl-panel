import { create } from 'zustand';

interface FileUpload {
    id: string;
    name: string;
    loaded: number;
    total: number;
    controller: AbortController;
}

interface UploadStore {
    uploads: FileUpload[];
    addUpload: (upload: FileUpload) => void;
    setProgress: (id: string, loaded: number) => void;
    removeUpload: (id: string) => void;
    cancelUpload: (id: string) => void;
    clearUploads: () => void;
}

const useUploadStore = create<UploadStore>((set, get) => ({
    uploads: [],
    addUpload: (upload) => set((state) => ({ uploads: [...state.uploads, upload] })),
    setProgress: (id, loaded) =>
        set((state) => ({
            uploads: state.uploads.map((upload) => (upload.id === id ? { ...upload, loaded } : upload)),
        })),
    removeUpload: (id) => set((state) => ({ uploads: state.uploads.filter((upload) => upload.id !== id) })),
    cancelUpload: (id) => {
        get()
            .uploads.find((upload) => upload.id === id)
            ?.controller.abort();
        get().removeUpload(id);
    },
    clearUploads: () => {
        get().uploads.forEach((upload) => upload.controller.abort());
        set({ uploads: [] });
    },
}));

export { useUploadStore };
export type { FileUpload };
