import { Trash2Icon } from 'lucide-react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const ConfirmDeleteButton: React.FC<{
    title: string;
    description: string;
    label: string;
    disabled?: boolean;
    onConfirm: () => void;
}> = ({ title, description, label, disabled, onConfirm }) => {
    return (
        <AlertDialog>
            <AlertDialogTrigger render={<Button variant='ghost' size='icon-sm' aria-label={label} disabled={disabled} />}>
                <Trash2Icon />
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant='destructive' onClick={onConfirm}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export { ConfirmDeleteButton };
