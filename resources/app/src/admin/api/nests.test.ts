import { describe, expect, it } from 'vitest';

import { toEggImportUrl } from '@/admin/api/nests';

describe('toEggImportUrl', () => {
    it('accepts http and https links and trims them', () => {
        expect(toEggImportUrl('  https://github.com/owner/eggs/blob/main/egg.json ')).toBe(
            'https://github.com/owner/eggs/blob/main/egg.json',
        );
        expect(toEggImportUrl('http://example.com/egg.json')).toBe('http://example.com/egg.json');
    });

    it('rejects empty input, other schemes and text that is not a link', () => {
        expect(toEggImportUrl('')).toBeNull();
        expect(toEggImportUrl('   ')).toBeNull();
        expect(toEggImportUrl('ftp://example.com/egg.json')).toBeNull();
        expect(toEggImportUrl('javascript:alert(1)')).toBeNull();
        expect(toEggImportUrl('github.com/owner/eggs/blob/main/egg.json')).toBeNull();
        expect(toEggImportUrl('not a url')).toBeNull();
    });
});
