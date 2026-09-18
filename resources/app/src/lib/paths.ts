const cleanDirectoryPath = (path: string): string => `/${path.split('/').filter(Boolean).join('/')}`;

const joinPath = (...segments: string[]): string => cleanDirectoryPath(segments.join('/'));

const hashToPath = (hash: string): string => {
    if (!hash) {
        return '/';
    }

    try {
        return cleanDirectoryPath(decodeURIComponent(hash.replace(/^#/, '')));
    } catch {
        return '/';
    }
};

const pathToHash = (path: string): string =>
    cleanDirectoryPath(path)
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');

const dirname = (path: string): string => cleanDirectoryPath(path.split('/').slice(0, -1).join('/'));

const basename = (path: string): string => path.split('/').filter(Boolean).pop() ?? '';

export { basename, cleanDirectoryPath, dirname, hashToPath, joinPath, pathToHash };
