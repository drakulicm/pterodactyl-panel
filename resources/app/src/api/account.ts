import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/http';

interface ApiKey {
    identifier: string;
    description: string;
    allowedIps: string[];
    createdAt: Date | null;
    lastUsedAt: Date | null;
}

interface SSHKey {
    name: string;
    publicKey: string;
    fingerprint: string;
    createdAt: Date;
}

interface RawApiKey {
    identifier: string;
    description: string;
    allowed_ips: string[];
    created_at: string | null;
    last_used_at: string | null;
}

interface RawSSHKey {
    name: string;
    public_key: string;
    fingerprint: string;
    created_at: string;
}

const toApiKey = (data: RawApiKey): ApiKey => ({
    identifier: data.identifier,
    description: data.description,
    allowedIps: data.allowed_ips,
    createdAt: data.created_at ? new Date(data.created_at) : null,
    lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : null,
});

const toSSHKey = (data: RawSSHKey): SSHKey => ({
    name: data.name,
    publicKey: data.public_key,
    fingerprint: data.fingerprint,
    createdAt: new Date(data.created_at),
});

const updateAccountEmail = async (data: { email: string; password: string }): Promise<void> => {
    await http.put('/api/client/account/email', data);
};

const updateAccountPassword = async (data: {
    current: string;
    password: string;
    confirmPassword: string;
}): Promise<void> => {
    await http.put('/api/client/account/password', {
        current_password: data.current,
        password: data.password,
        password_confirmation: data.confirmPassword,
    });
};

const getTwoFactorTokenData = async (): Promise<{ imageUrlData: string; secret: string }> => {
    const { data } = await http.get('/api/client/account/two-factor');

    return { imageUrlData: data.data.image_url_data, secret: data.data.secret };
};

const enableAccountTwoFactor = async (data: { code: string; password: string }): Promise<string[]> => {
    const response = await http.post('/api/client/account/two-factor', data);

    return response.data.attributes.tokens;
};

const disableAccountTwoFactor = async (data: { password: string }): Promise<void> => {
    await http.post('/api/client/account/two-factor/disable', data);
};

const getApiKeys = async (): Promise<ApiKey[]> => {
    const { data } = await http.get('/api/client/account/api-keys');

    return ((data.data ?? []) as { attributes: RawApiKey }[]).map(({ attributes }) => toApiKey(attributes));
};

const createApiKey = async (data: {
    description: string;
    allowedIps: string;
}): Promise<ApiKey & { secretToken: string }> => {
    const response = await http.post('/api/client/account/api-keys', {
        description: data.description,
        allowed_ips: data.allowedIps.trim().length ? data.allowedIps.trim().split('\n') : [],
    });

    return { ...toApiKey(response.data.attributes), secretToken: response.data.meta?.secret_token ?? '' };
};

const deleteApiKey = async (identifier: string): Promise<void> => {
    await http.delete(`/api/client/account/api-keys/${identifier}`);
};

const getSSHKeys = async (): Promise<SSHKey[]> => {
    const { data } = await http.get('/api/client/account/ssh-keys');

    return ((data.data ?? []) as { attributes: RawSSHKey }[]).map(({ attributes }) => toSSHKey(attributes));
};

const createSSHKey = async (data: { name: string; publicKey: string }): Promise<SSHKey> => {
    const response = await http.post('/api/client/account/ssh-keys', { name: data.name, public_key: data.publicKey });

    return toSSHKey(response.data.attributes);
};

const deleteSSHKey = async (fingerprint: string): Promise<void> => {
    await http.post('/api/client/account/ssh-keys/remove', { fingerprint });
};

const apiKeysQueryOptions = queryOptions({ queryKey: ['account', 'api-keys'], queryFn: getApiKeys });

const sshKeysQueryOptions = queryOptions({ queryKey: ['account', 'ssh-keys'], queryFn: getSSHKeys });

const twoFactorTokenQueryOptions = queryOptions({
    queryKey: ['account', 'two-factor'],
    queryFn: getTwoFactorTokenData,
    staleTime: 0,
    gcTime: 0,
});

export {
    apiKeysQueryOptions,
    createApiKey,
    createSSHKey,
    deleteApiKey,
    deleteSSHKey,
    disableAccountTwoFactor,
    enableAccountTwoFactor,
    sshKeysQueryOptions,
    twoFactorTokenQueryOptions,
    updateAccountEmail,
    updateAccountPassword,
};
export type { ApiKey, SSHKey };
