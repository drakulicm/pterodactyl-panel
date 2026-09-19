import type { UseQueryResult } from '@tanstack/react-query';
import { InboxIcon, SearchIcon } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { FormError } from '@/components/auth/FormError';
import { ListPagination } from '@/components/layout/ListPagination';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { httpErrorToHuman, type PaginatedResult } from '@/lib/http';
import { cn } from '@/lib/utils';

interface AdminColumn<Row> {
    header: string;
    className?: string;
    cell: (row: Row) => ReactNode;
}

interface AdminDataTableProps<Row> {
    query: UseQueryResult<PaginatedResult<Row>>;
    columns: AdminColumn<Row>[];
    getRowKey: (row: Row) => string | number;
    emptyTitle: string;
    emptyDescription?: string;
    search?: string;
    searchPlaceholder?: string;
    onSearchChange?: (value: string) => void;
    onPageChange?: (page: number) => void;
    onRowClick?: (row: Row) => void;
    toolbar?: ReactNode;
}

const AdminDataTable = <Row,>({
    query,
    columns,
    getRowKey,
    emptyTitle,
    emptyDescription,
    search,
    searchPlaceholder = 'Search...',
    onSearchChange,
    onPageChange,
    onRowClick,
    toolbar,
}: AdminDataTableProps<Row>) => {
    const { data, error, isPending } = query;
    const [value, setValue] = useState(search ?? '');
    const debounced = useDebouncedValue(value);
    const handleSearchChange = useRef(onSearchChange);
    handleSearchChange.current = onSearchChange;

    useEffect(() => {
        handleSearchChange.current?.(debounced);
    }, [debounced]);

    return (
        <div className='flex flex-col gap-4'>
            {(onSearchChange || toolbar) && (
                <div className='flex flex-wrap items-center gap-2'>
                    {onSearchChange && (
                        <InputGroup className='max-w-sm'>
                            <InputGroupInput
                                placeholder={searchPlaceholder}
                                value={value}
                                onChange={(event) => setValue(event.target.value)}
                            />
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                        </InputGroup>
                    )}
                    <div className='ml-auto flex items-center gap-2'>{toolbar}</div>
                </div>
            )}
            <FormError message={error ? httpErrorToHuman(error) : null} />
            {isPending ? (
                <Skeleton className='h-64 rounded-xl' />
            ) : data?.items.length ? (
                <div className='overflow-hidden rounded-xl border bg-card'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead key={column.header} className={column.className}>
                                        {column.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.map((row) => (
                                <TableRow
                                    key={getRowKey(row)}
                                    className={cn(onRowClick && 'cursor-pointer')}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                >
                                    {columns.map((column) => (
                                        <TableCell key={column.header} className={column.className}>
                                            {column.cell(row)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                !error && (
                    <Empty className='border'>
                        <EmptyHeader>
                            <EmptyMedia variant='icon'>
                                <InboxIcon />
                            </EmptyMedia>
                            <EmptyTitle>{emptyTitle}</EmptyTitle>
                            {emptyDescription && <EmptyDescription>{emptyDescription}</EmptyDescription>}
                        </EmptyHeader>
                    </Empty>
                )
            )}
            {data && onPageChange && <ListPagination pagination={data.pagination} onPageChange={onPageChange} />}
        </div>
    );
};

export { AdminDataTable };
export type { AdminColumn };
