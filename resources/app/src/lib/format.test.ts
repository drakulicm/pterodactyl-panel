import { describe, expect, it } from 'vitest';

import { bytesToString, formatIp, formatUptime, mbToBytes } from '@/lib/format';

describe('format', () => {
    it('formats byte sizes', () => {
        expect(bytesToString(0)).toBe('0 Bytes');
        expect(bytesToString(512)).toBe('512 Bytes');
        expect(bytesToString(1024)).toBe('1 KiB');
        expect(bytesToString(mbToBytes(1536))).toBe('1.5 GiB');
    });

    it('wraps IPv6 addresses', () => {
        expect(formatIp('127.0.0.1')).toBe('127.0.0.1');
        expect(formatIp('2001:db8::1')).toBe('[2001:db8::1]');
    });

    it('formats uptime', () => {
        expect(formatUptime(65000)).toBe('0h 1m 5s');
        expect(formatUptime(90061000)).toBe('1d 1h 1m');
    });
});
