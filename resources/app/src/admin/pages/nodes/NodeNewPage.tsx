import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';

import { NodeForm } from '@/admin/components/nodes/NodeForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';

const NodeNewPage: React.FC = () => {
    return (
        <>
            <PageHeader title='New node'>
                <Button variant='outline' size='sm' nativeButton={false} render={<Link to='/admin/nodes' />}>
                    <ArrowLeftIcon />
                    Back to nodes
                </Button>
            </PageHeader>
            <div className='mx-auto flex w-full max-w-7xl flex-col gap-4 p-4'>
                <p className='text-sm text-muted-foreground'>
                    Create a new local or remote node for servers to be installed to.
                </p>
                <NodeForm />
            </div>
        </>
    );
};

export { NodeNewPage };
