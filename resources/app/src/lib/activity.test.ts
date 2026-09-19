import { describe, expect, it } from 'vitest';

import { describeActivity } from '@/lib/activity';

const text = (event: string, properties?: Record<string, unknown>) =>
    describeActivity(event, properties)
        .map((segment) => segment.text)
        .join('');

describe('describeActivity', () => {
    it('renders an event that takes no properties', () => {
        expect(text('auth:success')).toBe('Logged in');
    });

    it('interpolates a single property', () => {
        expect(text('server:backup.delete', { name: 'weekly.tar.gz' })).toBe('Deleted the weekly.tar.gz backup');
    });

    it('highlights interpolated values but not the surrounding text', () => {
        expect(describeActivity('server:backup.delete', { name: 'weekly.tar.gz' })).toEqual([
            { text: 'Deleted the ', isHighlighted: false },
            { text: 'weekly.tar.gz', isHighlighted: true },
            { text: ' backup', isHighlighted: false },
        ]);
    });

    it('picks the singular string when one file is affected', () => {
        expect(text('server:file.delete', { count: 1, directory: '/home/container/', files: ['server.jar'] })).toBe(
            'Deleted /home/container/server.jar',
        );
    });

    it('picks the plural string when several files are affected', () => {
        expect(text('server:file.delete', { count: 3, directory: '/home/container/', files: ['a', 'b', 'c'] })).toBe(
            'Deleted 3 files in /home/container/',
        );
    });

    it('does not highlight the count in a plural string', () => {
        const segments = describeActivity('server:file.delete', { count: 3, directory: '/', files: [] });

        expect(segments.find((segment) => segment.text === '3')?.isHighlighted).toBe(false);
    });

    it('resolves dotted paths into the properties', () => {
        expect(
            text('server:file.rename', {
                count: 1,
                directory: '/home/container/',
                files: [{ from: 'old.txt', to: 'new.txt' }],
            }),
        ).toBe('Renamed /home/container/old.txt to /home/container/new.txt');
    });

    it('renders adjacent tokens without dropping either', () => {
        expect(describeActivity('server:file.uploaded', { directory: '/home/', file: 'a.txt' })).toEqual([
            { text: 'Uploaded ', isHighlighted: false },
            { text: '/home/', isHighlighted: true },
            { text: 'a.txt', isHighlighted: true },
        ]);
    });

    it('joins array values', () => {
        expect(text('server:file.decompress', { files: ['a.zip', 'b.zip'], directory: '/' })).toBe(
            'Decompressed a.zip, b.zip in /',
        );
    });

    it('keeps quotes that surround a token', () => {
        expect(text('server:console.command', { command: 'say hello' })).toBe('Executed "say hello" on the server');
    });

    it('falls back to the base string when no plural form exists', () => {
        expect(text('server:backup.delete', { count: 2, name: 'weekly.tar.gz' })).toBe(
            'Deleted the weekly.tar.gz backup',
        );
    });

    it('falls back to the raw event name when the string is unknown', () => {
        expect(describeActivity('server:something.invented', {})).toEqual([
            { text: 'server:something.invented', isHighlighted: false },
        ]);
    });

    it('only replaces the first colon when looking up the string', () => {
        expect(text('server:sftp.write', { count: 1, files: ['config.yml'] })).toBe(
            'Modified the contents of config.yml',
        );
    });

    it('tolerates missing properties', () => {
        expect(() => describeActivity('server:settings.rename', {})).not.toThrow();
    });
});
