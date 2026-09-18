import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PaginationDataSet } from '@/lib/http';

const ListPagination: React.FC<{
    pagination: PaginationDataSet;
    onPageChange: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
    if (pagination.totalPages <= 1) {
        return null;
    }

    return (
        <div className='flex items-center justify-between gap-4'>
            <p className='text-sm text-muted-foreground'>
                Page {pagination.currentPage} of {pagination.totalPages} · {pagination.total} total
            </p>
            <div className='flex items-center gap-2'>
                <Button
                    variant='outline'
                    size='sm'
                    disabled={pagination.currentPage <= 1}
                    onClick={() => onPageChange(pagination.currentPage - 1)}
                >
                    <ChevronLeftIcon />
                    Previous
                </Button>
                <Button
                    variant='outline'
                    size='sm'
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => onPageChange(pagination.currentPage + 1)}
                >
                    Next
                    <ChevronRightIcon />
                </Button>
            </div>
        </div>
    );
};

export { ListPagination };
