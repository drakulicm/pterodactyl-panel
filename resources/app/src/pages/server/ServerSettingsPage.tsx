import { PageHeader } from '@/components/layout/PageHeader';
import { DebugInfoCard } from '@/components/server/settings/DebugInfoCard';
import { ReinstallServerCard } from '@/components/server/settings/ReinstallServerCard';
import { RenameServerCard } from '@/components/server/settings/RenameServerCard';
import { SftpDetailsCard } from '@/components/server/settings/SftpDetailsCard';
import { useServer } from '@/hooks/useServer';
import { hasPermission } from '@/lib/permissions';

const ServerSettingsPage: React.FC = () => {
    const { permissions } = useServer();

    return (
        <>
            <PageHeader title='Settings' />
            <div className='mx-auto grid w-full max-w-5xl items-start gap-4 p-4 lg:grid-cols-2'>
                <div className='flex flex-col gap-4'>
                    {hasPermission(permissions, 'file.sftp') && <SftpDetailsCard />}
                    <DebugInfoCard />
                </div>
                <div className='flex flex-col gap-4'>
                    {hasPermission(permissions, 'settings.rename') && <RenameServerCard />}
                    {hasPermission(permissions, 'settings.reinstall') && <ReinstallServerCard />}
                </div>
            </div>
        </>
    );
};

export { ServerSettingsPage };
