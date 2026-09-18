import { describe, expect, it } from 'vitest';

import { basename, cleanDirectoryPath, dirname, hashToPath, joinPath, pathToHash } from '@/lib/paths';

describe('paths', () => {
    it('normalises directory paths', () => {
        expect(cleanDirectoryPath('')).toBe('/');
        expect(cleanDirectoryPath('//plugins///config/')).toBe('/plugins/config');
    });

    it('joins segments', () => {
        expect(joinPath('/', 'eula.txt')).toBe('/eula.txt');
        expect(joinPath('/plugins/', '/config.yml')).toBe('/plugins/config.yml');
    });

    it('splits file paths', () => {
        expect(dirname('/plugins/config.yml')).toBe('/plugins');
        expect(dirname('/eula.txt')).toBe('/');
        expect(basename('/plugins/config.yml')).toBe('config.yml');
    });

    it('round-trips hashes with special characters', () => {
        const path = '/my folder/file #1.txt';

        expect(hashToPath(pathToHash(path))).toBe(path);
        expect(hashToPath('')).toBe('/');
        expect(hashToPath('%E0%A4%A')).toBe('/');
    });
});
