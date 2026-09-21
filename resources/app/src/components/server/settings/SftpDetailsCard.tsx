import { CopyIcon, ExternalLinkIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { useServer } from '@/hooks/useServer';
import { formatIp } from '@/lib/format';
import { sessionUser } from '@/lib/session';

const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard.');
};

const SftpDetailsCard: React.FC = () => {
    const { server } = useServer();
    const host = `${formatIp(server.sftpDetails.ip)}:${server.sftpDetails.port}`;
    const username = `${sessionUser?.username ?? ''}.${server.id}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle>SFTP details</CardTitle>
            </CardHeader>
            <CardContent>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor='sftp-address'>Server address</FieldLabel>
                        <InputGroup>
                            <InputGroupInput
                                id='sftp-address'
                                value={`sftp://${host}`}
                                readOnly
                                className='min-w-0 font-mono'
                            />
                            <InputGroupAddon align='inline-end'>
                                <InputGroupButton
                                    size='icon-xs'
                                    aria-label='Copy'
                                    onClick={() => copyToClipboard(`sftp://${host}`)}
                                >
                                    <CopyIcon />
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='sftp-username'>Username</FieldLabel>
                        <InputGroup>
                            <InputGroupInput id='sftp-username' value={username} readOnly className='min-w-0 font-mono' />
                            <InputGroupAddon align='inline-end'>
                                <InputGroupButton size='icon-xs' aria-label='Copy' onClick={() => copyToClipboard(username)}>
                                    <CopyIcon />
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                    </Field>
                    <div className='flex items-center gap-4'>
                        <p className='flex-1 border-l-4 border-primary py-1 pl-3 text-xs text-muted-foreground'>
                            Your SFTP password is the same as the password you use to access this panel.
                        </p>
                        <Button
                            variant='outline'
                            nativeButton={false}
                            render={<a href={`sftp://${username}@${host}`} />}
                        >
                            <ExternalLinkIcon />
                            Launch SFTP
                        </Button>
                    </div>
                </FieldGroup>
            </CardContent>
        </Card>
    );
};

export { SftpDetailsCard };
