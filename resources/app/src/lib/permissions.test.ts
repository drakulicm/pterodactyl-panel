import { describe, expect, it } from 'vitest';

import { hasAnyPermission, hasPermission } from '@/lib/permissions';

describe('hasPermission', () => {
    it('grants everything to owners', () => {
        expect(hasPermission(['*'], 'file.delete')).toBe(true);
        expect(hasPermission(['*'], 'backup.*')).toBe(true);
    });

    it('matches exact permissions', () => {
        expect(hasPermission(['file.read'], 'file.read')).toBe(true);
        expect(hasPermission(['file.read'], 'file.delete')).toBe(false);
    });

    it('matches wildcard queries against any permission in the group', () => {
        expect(hasPermission(['file.read'], 'file.*')).toBe(true);
        expect(hasPermission(['filesystem.read'], 'file.*')).toBe(false);
        expect(hasPermission([], 'file.*')).toBe(false);
    });
});

describe('hasAnyPermission', () => {
    it('treats null as unrestricted', () => {
        expect(hasAnyPermission([], null)).toBe(true);
    });

    it('accepts a list of alternatives', () => {
        expect(hasAnyPermission(['file.sftp'], ['settings.*', 'file.sftp'])).toBe(true);
        expect(hasAnyPermission(['user.read'], ['settings.*', 'file.sftp'])).toBe(false);
    });
});
