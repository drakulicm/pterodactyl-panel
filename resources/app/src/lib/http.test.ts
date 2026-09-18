import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { getPaginationSet, httpErrorToHuman, isTwoFactorRequiredError, withQueryBuilderParams } from '@/lib/http';

const createError = (status: number, data: unknown): AxiosError =>
    new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, { status, data } as AxiosResponse);

describe('withQueryBuilderParams', () => {
    it('builds filters and sorts', () => {
        expect(
            withQueryBuilderParams({ page: 2, filters: { event: 'auth:success', ip: '' }, sorts: { timestamp: -1 } }),
        ).toEqual({ 'filter[event]': 'auth:success', sort: '-timestamp', page: 2 });
    });

    it('returns an empty object without input', () => {
        expect(withQueryBuilderParams()).toEqual({});
    });
});

describe('httpErrorToHuman', () => {
    it('prefers the panel error detail', () => {
        expect(httpErrorToHuman(createError(422, { errors: [{ detail: 'The name field is required.' }] }))).toBe(
            'The name field is required.',
        );
    });

    it('reads wings errors and stringified bodies', () => {
        expect(httpErrorToHuman(createError(500, { error: 'disk full' }))).toBe('disk full');
        expect(httpErrorToHuman(createError(500, JSON.stringify({ error: 'disk full' })))).toBe('disk full');
    });

    it('falls back to the error message', () => {
        expect(httpErrorToHuman(new Error('boom'))).toBe('boom');
    });
});

describe('isTwoFactorRequiredError', () => {
    it('detects the forced two-factor response', () => {
        expect(isTwoFactorRequiredError(createError(400, { errors: [{ code: 'TwoFactorAuthRequiredException' }] }))).toBe(
            true,
        );
        expect(isTwoFactorRequiredError(createError(400, { errors: [{ code: 'Other' }] }))).toBe(false);
    });
});

describe('getPaginationSet', () => {
    it('maps pagination keys', () => {
        expect(getPaginationSet({ total: 10, count: 5, per_page: 5, current_page: 2, total_pages: 2 })).toEqual({
            total: 10,
            count: 5,
            perPage: 5,
            currentPage: 2,
            totalPages: 2,
        });
    });
});
