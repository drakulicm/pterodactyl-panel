import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

const FormError: React.FC<{
    message?: string | null;
}> = ({ message }) => {
    if (!message) {
        return null;
    }

    return (
        <Alert variant='destructive'>
            <CircleAlertIcon />
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
};

export { FormError };
