import { ConstructionIcon } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

const AdminPlaceholderPage: React.FC = () => {
    return (
        <>
            <PageHeader title='Administration' />
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant='icon'>
                        <ConstructionIcon />
                    </EmptyMedia>
                    <EmptyTitle>Not available yet</EmptyTitle>
                    <EmptyDescription>This section of the admin area has not been built yet.</EmptyDescription>
                </EmptyHeader>
            </Empty>
        </>
    );
};

export { AdminPlaceholderPage };
