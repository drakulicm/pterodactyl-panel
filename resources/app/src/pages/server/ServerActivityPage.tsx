import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { serverActivityQueryOptions } from '@/api/activity';
import { ActivityLogList } from '@/components/activity/ActivityLogList';
import { PageHeader } from '@/components/layout/PageHeader';
import { useServer } from '@/hooks/useServer';

const ServerActivityPage: React.FC = () => {
    const { server } = useServer();
    const [page, setPage] = useState(1);
    const [event, setEvent] = useState<string>();
    const query = useQuery(
        serverActivityQueryOptions(server.uuid, { page, filters: { event }, sorts: { timestamp: -1 } }),
    );

    const handleEventFilterChange = (value?: string) => {
        setEvent(value);
        setPage(1);
    };

    return (
        <>
            <PageHeader title='Activity' />
            <div className='mx-auto w-full max-w-4xl p-4'>
                <ActivityLogList
                    query={query}
                    eventFilter={event}
                    onEventFilterChange={handleEventFilterChange}
                    onPageChange={setPage}
                />
            </div>
        </>
    );
};

export { ServerActivityPage };
