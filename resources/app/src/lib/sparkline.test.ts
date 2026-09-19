import { describe, expect, it } from 'vitest';

import { buildSparkline, TOP_INSET, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '@/lib/sparkline';

const coordinates = (path: string): number[] =>
    path
        .split(/[^\d.-]+/)
        .filter((entry) => entry.length > 0)
        .map(Number);

describe('sparkline', () => {
    it('returns nothing for an empty series', () => {
        expect(buildSparkline([], 10)).toEqual({ line: '', area: '' });
    });

    it('puts a flat zero series along the baseline', () => {
        const { line } = buildSparkline([0, 0, 0], 10);

        expect(coordinates(line).filter((_, index) => index % 2 === 1).every((y) => y === VIEWBOX_HEIGHT)).toBe(true);
    });

    it('puts the maximum value at the top inset', () => {
        const { line } = buildSparkline([0, 10], 10);

        expect(line.endsWith(`${VIEWBOX_WIDTH} ${TOP_INSET}`)).toBe(true);
    });

    it('closes the area back along the baseline', () => {
        const { area } = buildSparkline([1, 2, 3], 3);

        expect(area.endsWith(`L ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT} L 0 ${VIEWBOX_HEIGHT} Z`)).toBe(true);
    });

    it('never overshoots the plot area on a spike', () => {
        const { line } = buildSparkline([0, 0, 10, 0, 0], 10);
        const verticals = coordinates(line).filter((_, index) => index % 2 === 1);

        expect(Math.min(...verticals)).toBeGreaterThanOrEqual(TOP_INSET);
        expect(Math.max(...verticals)).toBeLessThanOrEqual(VIEWBOX_HEIGHT);
    });

    it('spans the full width with one curve per interval', () => {
        const series = [0, 2, 14, 38, 61, 44, 22, 18, 25, 47, 66, 52, 31, 20, 16, 19, 28, 40, 35, 27];
        const { line } = buildSparkline(series, Math.max(...series));
        const horizontals = coordinates(line).filter((_, index) => index % 2 === 0);

        expect((line.match(/C /g) ?? []).length).toBe(series.length - 1);
        expect(line.startsWith('M 0 ')).toBe(true);
        expect(Math.max(...horizontals)).toBe(VIEWBOX_WIDTH);
        expect(horizontals.every((x, index) => index === 0 || x >= (horizontals[index - 1] ?? 0))).toBe(true);
    });

    it('treats a zero maximum as a flat series', () => {
        const { line } = buildSparkline([0, 0, 0], 0);

        expect(line).not.toContain('NaN');
    });
});
