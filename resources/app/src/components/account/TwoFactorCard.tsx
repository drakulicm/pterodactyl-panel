import { useMutation, useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { toast } from 'sonner';

import { disableAccountTwoFactor, enableAccountTwoFactor, twoFactorTokenQueryOptions } from '@/api/account';
import { FormError } from '@/components/auth/FormError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { httpErrorToHuman } from '@/lib/http';
import { sessionUser } from '@/lib/session';

const CODE_LENGTH = 6;

const SetupDialog: React.FC<{
    onEnabled: () => void;
    onClose: () => void;
}> = ({ onEnabled, onClose }) => {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const token = useQuery(twoFactorTokenQueryOptions);

    const mutation = useMutation({
        mutationFn: enableAccountTwoFactor,
        onSuccess: onEnabled,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        mutation.mutate({ code, password });
    };

    const error = token.error ?? mutation.error;

    if (mutation.isSuccess) {
        return (
            <>
                <DialogHeader>
                    <DialogTitle>Two-step verification enabled</DialogTitle>
                    <DialogDescription>
                        Store these recovery codes somewhere safe. They are the only way back into your account if you
                        lose your device, and they will not be shown again.
                    </DialogDescription>
                </DialogHeader>
                <pre className='grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-muted p-4 font-mono text-sm'>
                    {mutation.data.map((recoveryToken) => (
                        <code key={recoveryToken}>{recoveryToken}</code>
                    ))}
                </pre>
                <DialogFooter>
                    <Button onClick={onClose}>Done</Button>
                </DialogFooter>
            </>
        );
    }

    return (
        <form onSubmit={handleSubmit} className='contents'>
            <DialogHeader>
                <DialogTitle>Enable two-step verification</DialogTitle>
                <DialogDescription>
                    Scan the QR code with your authenticator app, then enter the generated code to confirm.
                </DialogDescription>
            </DialogHeader>
            <FieldGroup>
                <FormError message={error ? httpErrorToHuman(error) : null} />
                <div className='flex flex-col items-center gap-3'>
                    {token.data ? (
                        <div className='rounded-lg bg-white p-3'>
                            <QRCodeSVG value={token.data.imageUrlData} size={160} />
                        </div>
                    ) : (
                        <Skeleton className='size-46 rounded-lg' />
                    )}
                    <code className='text-xs break-all text-muted-foreground select-all'>{token.data?.secret}</code>
                </div>
                <Field>
                    <FieldLabel htmlFor='two-factor-code'>Authentication Code</FieldLabel>
                    <InputOTP id='two-factor-code' maxLength={CODE_LENGTH} value={code} onChange={setCode}>
                        <InputOTPGroup>
                            {Array.from({ length: CODE_LENGTH }, (_, index) => (
                                <InputOTPSlot key={index} index={index} />
                            ))}
                        </InputOTPGroup>
                    </InputOTP>
                </Field>
                <Field>
                    <FieldLabel htmlFor='two-factor-password'>Account Password</FieldLabel>
                    <Input
                        id='two-factor-password'
                        type='password'
                        autoComplete='current-password'
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </Field>
            </FieldGroup>
            <DialogFooter>
                <Button type='button' variant='outline' onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    type='submit'
                    disabled={mutation.isPending || code.length !== CODE_LENGTH || password.length === 0}
                >
                    {mutation.isPending && <Spinner />}
                    Enable
                </Button>
            </DialogFooter>
        </form>
    );
};

const DisableDialog: React.FC<{
    onDisabled: () => void;
    onClose: () => void;
}> = ({ onDisabled, onClose }) => {
    const [password, setPassword] = useState('');

    const mutation = useMutation({
        mutationFn: disableAccountTwoFactor,
        onSuccess: () => {
            toast.success('Two-step verification has been disabled.');
            onDisabled();
        },
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        mutation.mutate({ password });
    };

    return (
        <form onSubmit={handleSubmit} className='contents'>
            <DialogHeader>
                <DialogTitle>Disable two-step verification</DialogTitle>
                <DialogDescription>
                    Your account will no longer be protected by a second authentication factor.
                </DialogDescription>
            </DialogHeader>
            <FieldGroup>
                <FormError message={mutation.error ? httpErrorToHuman(mutation.error) : null} />
                <Field>
                    <FieldLabel htmlFor='disable-two-factor-password'>Account Password</FieldLabel>
                    <Input
                        id='disable-two-factor-password'
                        type='password'
                        autoComplete='current-password'
                        autoFocus
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </Field>
            </FieldGroup>
            <DialogFooter>
                <Button type='button' variant='outline' onClick={onClose}>
                    Cancel
                </Button>
                <Button type='submit' variant='destructive' disabled={mutation.isPending || password.length === 0}>
                    {mutation.isPending && <Spinner />}
                    Disable
                </Button>
            </DialogFooter>
        </form>
    );
};

const TwoFactorCard: React.FC = () => {
    const [isEnabled, setIsEnabled] = useState(sessionUser?.useTotp ?? false);
    const [isOpen, setIsOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'setup' | 'disable'>('setup');

    const handleOpen = () => {
        setDialogMode(isEnabled ? 'disable' : 'setup');
        setIsOpen(true);
    };

    const handleClose = () => setIsOpen(false);

    const handleDisabled = () => {
        setIsEnabled(false);
        setIsOpen(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    Two-step verification
                    <Badge variant={isEnabled ? 'default' : 'secondary'}>{isEnabled ? 'Enabled' : 'Disabled'}</Badge>
                </CardTitle>
                <CardDescription>
                    {isEnabled
                        ? 'Two-step verification is currently enabled on your account.'
                        : 'Require a code from your authenticator app whenever you sign in.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant={isEnabled ? 'destructive' : 'default'} onClick={handleOpen}>
                    {isEnabled ? 'Disable two-step' : 'Enable two-step'}
                </Button>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent showCloseButton={false}>
                        {dialogMode === 'setup' ? (
                            <SetupDialog onEnabled={() => setIsEnabled(true)} onClose={handleClose} />
                        ) : (
                            <DisableDialog onDisabled={handleDisabled} onClose={handleClose} />
                        )}
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export { TwoFactorCard };
