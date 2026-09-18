import { useRouterState } from '@tanstack/react-router';
import { ShieldAlertIcon } from 'lucide-react';

import { TwoFactorCard } from '@/components/account/TwoFactorCard';
import { UpdateEmailForm } from '@/components/account/UpdateEmailForm';
import { UpdatePasswordForm } from '@/components/account/UpdatePasswordForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AccountPage: React.FC = () => {
    const isTwoFactorRedirect = useRouterState({ select: (state) => state.location.state.twoFactorRedirect });

    return (
        <>
            <PageHeader title='Account' />
            <div className='mx-auto flex w-full max-w-5xl flex-col gap-4 p-4'>
                {isTwoFactorRedirect && (
                    <Alert variant='destructive'>
                        <ShieldAlertIcon />
                        <AlertTitle>Two-step verification required</AlertTitle>
                        <AlertDescription>
                            Your account must have two-step verification enabled in order to continue.
                        </AlertDescription>
                    </Alert>
                )}
                <div className='grid items-start gap-4 lg:grid-cols-2'>
                    <UpdatePasswordForm />
                    <div className='flex flex-col gap-4'>
                        <UpdateEmailForm />
                        <TwoFactorCard />
                    </div>
                </div>
            </div>
        </>
    );
};

export { AccountPage };
