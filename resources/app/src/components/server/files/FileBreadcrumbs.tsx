import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useServer } from '@/hooks/useServer';
import { pathToHash } from '@/lib/paths';

const FileBreadcrumbs: React.FC<{
    directory: string;
    fileName?: string;
}> = ({ directory, fileName }) => {
    const { server } = useServer();
    const segments = directory.split('/').filter(Boolean);

    return (
        <Breadcrumb>
            <BreadcrumbList className='font-mono text-xs'>
                <BreadcrumbItem>/home</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink render={<Link to='/server/$id/files' params={{ id: server.id }} hash='/' />}>
                        container
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {segments.map((segment, index) => {
                    const path = `/${segments.slice(0, index + 1).join('/')}`;
                    const isLast = index === segments.length - 1 && !fileName;

                    return (
                        <Fragment key={path}>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{segment}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink
                                        render={
                                            <Link
                                                to='/server/$id/files'
                                                params={{ id: server.id }}
                                                hash={pathToHash(path)}
                                            />
                                        }
                                    >
                                        {segment}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    );
                })}
                {fileName && (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{fileName}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </>
                )}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export { FileBreadcrumbs };
