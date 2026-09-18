import axios, { type AxiosInstance, isAxiosError } from 'axios';

const http: AxiosInstance = axios.create({
    withCredentials: true,
    withXSRFToken: true,
    timeout: 20000,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

const httpErrorToHuman = (error: unknown): string => {
    if (!isAxiosError(error)) {
        return error instanceof Error ? error.message : 'An unexpected error occurred.';
    }

    let data: unknown = error.response?.data;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            data = undefined;
        }
    }

    if (data && typeof data === 'object') {
        const { errors, error: wingsError } = data as { errors?: { detail?: string }[]; error?: unknown };
        if (errors?.[0]?.detail) {
            return errors[0].detail;
        }

        if (typeof wingsError === 'string') {
            return wingsError;
        }
    }

    return error.message;
};

const isTwoFactorRequiredError = (error: unknown): boolean => {
    if (!isAxiosError(error) || error.response?.status !== 400) {
        return false;
    }

    const { errors } = (error.response.data ?? {}) as { errors?: { code?: string }[] };

    return errors?.[0]?.code === 'TwoFactorAuthRequiredException';
};

interface FractalResponseData<Attributes = Record<string, unknown>> {
    object: string;
    attributes: Attributes & {
        relationships?: Record<string, FractalResponseData | FractalResponseList | null | undefined>;
    };
}

interface FractalResponseList<Attributes = Record<string, unknown>> {
    object: 'list';
    data: FractalResponseData<Attributes>[];
}

interface FractalPagination {
    total: number;
    count: number;
    per_page: number;
    current_page: number;
    total_pages: number;
}

interface FractalPaginatedResponse<Attributes = Record<string, unknown>> extends FractalResponseList<Attributes> {
    meta: { pagination: FractalPagination };
}

interface PaginationDataSet {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
}

interface PaginatedResult<T> {
    items: T[];
    pagination: PaginationDataSet;
}

const getPaginationSet = (data: FractalPagination): PaginationDataSet => ({
    total: data.total,
    count: data.count,
    perPage: data.per_page,
    currentPage: data.current_page,
    totalPages: data.total_pages,
});

type QueryBuilderFilterValue = string | number | boolean | null;

interface QueryBuilderParams<FilterKeys extends string = string, SortKeys extends string = string> {
    page?: number;
    filters?: { [K in FilterKeys]?: QueryBuilderFilterValue | readonly QueryBuilderFilterValue[] };
    sorts?: { [K in SortKeys]?: -1 | 0 | 1 | 'asc' | 'desc' | null };
}

const withQueryBuilderParams = (data?: QueryBuilderParams): Record<string, unknown> => {
    if (!data) {
        return {};
    }

    const filters = Object.entries(data.filters ?? {}).reduce<Record<string, unknown>>((result, [key, value]) => {
        if (!value || value === '') {
            return result;
        }

        return { ...result, [`filter[${key}]`]: value };
    }, {});

    const sorts = Object.entries(data.sorts ?? {}).reduce<string[]>((result, [key, value]) => {
        if (!value || ![1, -1, 'asc', 'desc'].includes(value)) {
            return result;
        }

        return [...result, (value === -1 || value === 'desc' ? '-' : '') + key];
    }, []);

    return {
        ...filters,
        sort: sorts.length ? sorts.join(',') : undefined,
        page: data.page,
    };
};

export { getPaginationSet, http, httpErrorToHuman, isTwoFactorRequiredError, withQueryBuilderParams };
export type {
    FractalPaginatedResponse,
    FractalResponseData,
    FractalResponseList,
    PaginatedResult,
    PaginationDataSet,
    QueryBuilderParams,
};
