import { useCallback, useEffect, useRef } from 'react';

import { siteConfiguration } from '@/lib/session';

interface Grecaptcha {
    ready: (callback: () => void) => void;
    render: (
        container: HTMLElement,
        parameters: { sitekey: string; size: 'invisible'; callback: (token: string) => void; 'error-callback': () => void },
    ) => number;
    execute: (widgetId: number) => void;
    reset: (widgetId: number) => void;
}

declare global {
    interface Window {
        grecaptcha?: Grecaptcha;
    }
}

const SCRIPT_ID = 'recaptcha-script';

const loadScript = (): Promise<Grecaptcha> =>
    new Promise((resolve, reject) => {
        const handleReady = () => {
            const { grecaptcha } = window;
            if (!grecaptcha) {
                reject(new Error('reCAPTCHA failed to load.'));
                return;
            }

            grecaptcha.ready(() => resolve(grecaptcha));
        };

        if (window.grecaptcha) {
            handleReady();
            return;
        }

        const existing = document.getElementById(SCRIPT_ID);
        if (existing) {
            existing.addEventListener('load', handleReady);
            return;
        }

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.addEventListener('load', handleReady);
        script.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load.')));
        document.head.appendChild(script);
    });

const useRecaptcha = (): { getToken: () => Promise<string | null> } => {
    const { enabled, siteKey } = siteConfiguration.recaptcha;
    const widgetId = useRef<number | null>(null);
    const container = useRef<HTMLDivElement | null>(null);
    const pending = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void } | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const element = document.createElement('div');
        document.body.appendChild(element);
        container.current = element;

        return () => {
            element.remove();
            container.current = null;
            widgetId.current = null;
        };
    }, [enabled]);

    const getToken = useCallback(async (): Promise<string | null> => {
        if (!enabled) {
            return null;
        }

        const grecaptcha = await loadScript();
        const element = container.current;
        if (!element) {
            throw new Error('reCAPTCHA is not ready.');
        }

        if (widgetId.current === null) {
            widgetId.current = grecaptcha.render(element, {
                sitekey: siteKey,
                size: 'invisible',
                callback: (token) => pending.current?.resolve(token),
                'error-callback': () => pending.current?.reject(new Error('reCAPTCHA verification failed.')),
            });
        } else {
            grecaptcha.reset(widgetId.current);
        }

        const id = widgetId.current;

        return new Promise<string>((resolve, reject) => {
            pending.current = { resolve, reject };
            grecaptcha.execute(id);
        });
    }, [enabled, siteKey]);

    return { getToken };
};

export { useRecaptcha };
