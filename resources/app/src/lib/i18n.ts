import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

i18n.use(HttpBackend)
    .use(initReactI18next)
    .init({
        lng: 'en',
        fallbackLng: 'en',
        ns: ['activity'],
        defaultNS: 'activity',
        keySeparator: '.',
        backend: {
            loadPath: '/locales/locale.json?locale={{lng}}&namespace={{ns}}',
            parse: (data: string, language?: string | string[], namespace?: string | string[]) => {
                const parsed = JSON.parse(data) as Record<string, Record<string, unknown>>;

                return parsed[String(language)]?.[String(namespace)] ?? {};
            },
        },
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
    });

export { i18n };
