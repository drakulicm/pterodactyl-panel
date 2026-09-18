import { queryOptions } from '@tanstack/react-query';

import { BASE } from '@/admin/api/client';
import { http } from '@/lib/http';

interface SettingsDocument<Attributes, Meta> {
    attributes: Attributes;
    meta: Meta & { environment_only: boolean };
}

interface GeneralSettings {
    'app:name': string;
    'app:locale': string;
    'pterodactyl:auth:2fa_required': number;
}

interface MailSettings {
    'mail:mailers:smtp:host': string | null;
    'mail:mailers:smtp:port': number | null;
    'mail:mailers:smtp:encryption': string | null;
    'mail:mailers:smtp:username': string | null;
    'mail:from:address': string | null;
    'mail:from:name': string | null;
    has_password: boolean;
}

interface MailSettingsUpdate extends Omit<MailSettings, 'has_password'> {
    'mail:mailers:smtp:password'?: string;
}

interface AdvancedSettings {
    'recaptcha:enabled': boolean;
    'recaptcha:website_key': string;
    has_recaptcha_secret_key: boolean;
    'pterodactyl:guzzle:timeout': number;
    'pterodactyl:guzzle:connect_timeout': number;
    'pterodactyl:client_features:allocations:enabled': boolean;
    'pterodactyl:client_features:allocations:range_start': number | null;
    'pterodactyl:client_features:allocations:range_end': number | null;
}

interface AdvancedSettingsUpdate extends Omit<AdvancedSettings, 'has_recaptcha_secret_key'> {
    'recaptcha:secret_key'?: string;
}

type GeneralSettingsDocument = SettingsDocument<GeneralSettings, { languages: Record<string, string> }>;
type MailSettingsDocument = SettingsDocument<MailSettings, { driver: string; disabled: boolean }>;
type AdvancedSettingsDocument = SettingsDocument<AdvancedSettings, { recaptcha_using_shipped_keys: boolean }>;

const settingsQueryOptions = <Document>(group: 'general' | 'mail' | 'advanced') =>
    queryOptions({
        queryKey: ['admin', '/settings', group],
        queryFn: async (): Promise<Document> => {
            const { data } = await http.get(`${BASE}/settings/${group}`);

            return { attributes: data.attributes, meta: data.meta } as Document;
        },
    });

const generalSettingsQueryOptions = settingsQueryOptions<GeneralSettingsDocument>('general');
const mailSettingsQueryOptions = settingsQueryOptions<MailSettingsDocument>('mail');
const advancedSettingsQueryOptions = settingsQueryOptions<AdvancedSettingsDocument>('advanced');

const updateGeneralSettings = async (body: GeneralSettings): Promise<void> => {
    await http.patch(`${BASE}/settings/general`, body);
};

const updateMailSettings = async (body: MailSettingsUpdate): Promise<void> => {
    await http.patch(`${BASE}/settings/mail`, body);
};

const updateAdvancedSettings = async (body: AdvancedSettingsUpdate): Promise<void> => {
    await http.patch(`${BASE}/settings/advanced`, body);
};

const sendTestMail = async (): Promise<void> => {
    await http.post(`${BASE}/settings/mail/test`);
};

export {
    advancedSettingsQueryOptions,
    generalSettingsQueryOptions,
    mailSettingsQueryOptions,
    sendTestMail,
    updateAdvancedSettings,
    updateGeneralSettings,
    updateMailSettings,
};
export type {
    AdvancedSettings,
    AdvancedSettingsDocument,
    AdvancedSettingsUpdate,
    GeneralSettings,
    GeneralSettingsDocument,
    MailSettings,
    MailSettingsDocument,
    MailSettingsUpdate,
};
