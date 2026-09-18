import { Link } from '@tanstack/react-router';
import { isAxiosError } from 'axios';
import { TriangleAlertIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { httpErrorToHuman } from '@/lib/http';

const RouteError: React.FC<{
    error: unknown;
}> = ({ error }) => {
    const isNotFound = isAxiosError(error) && error.response?.status === 404;

    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant='icon'>
                    <TriangleAlertIcon />
                </EmptyMedia>
                <EmptyTitle>{isNotFound ? 'Not found' : 'Something went wrong'}</EmptyTitle>
                <EmptyDescription>
                    {isNotFound ? 'The requested resource could not be found.' : httpErrorToHuman(error)}
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button variant='outline' render={<Link to='/' />}>
                    Back to servers
                </Button>
            </EmptyContent>
        </Empty>
    );
};

export { RouteError };
