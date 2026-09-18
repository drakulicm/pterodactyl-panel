interface RawUser {
    uuid: string;
    username: string;
    email: string;
    language: string;
    root_admin: boolean;
    use_totp: boolean;
    created_at: string;
    updated_at: string;
}

interface SiteConfiguration {
    name: string;
    locale: string;
    recaptcha: {
        enabled: boolean;
        siteKey: string;
    };
}

interface SessionUser {
    uuid: string;
    username: string;
    email: string;
    language: string;
    rootAdmin: boolean;
    useTotp: boolean;
    createdAt: Date;
    updatedAt: Date;
}

declare global {
    interface Window {
        PterodactylUser?: RawUser;
        SiteConfiguration?: SiteConfiguration;
        UiConfiguration?: { newAdmin: boolean };
    }
}

const toSessionUser = (raw: RawUser): SessionUser => ({
    uuid: raw.uuid,
    username: raw.username,
    email: raw.email,
    language: raw.language,
    rootAdmin: raw.root_admin,
    useTotp: raw.use_totp,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
});

const sessionUser: SessionUser | undefined = window.PterodactylUser ? toSessionUser(window.PterodactylUser) : undefined;

const siteConfiguration: SiteConfiguration = window.SiteConfiguration ?? {
    name: 'Pterodactyl',
    locale: 'en',
    recaptcha: { enabled: false, siteKey: '' },
};

const isNewAdminEnabled = window.UiConfiguration?.newAdmin ?? false;

export { isNewAdminEnabled, sessionUser, siteConfiguration };
export type { SessionUser, SiteConfiguration };
