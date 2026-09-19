import '@/styles/globals.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { queryClient } from '@/lib/queryClient';
import { watchSystemTheme } from '@/lib/theme';
import { router } from '@/router';
import { useThemeStore } from '@/stores/themeStore';

watchSystemTheme((resolved) => useThemeStore.getState().setResolvedMode(resolved));

const container = document.getElementById('app');

if (container) {
    createRoot(container).render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </StrictMode>,
    );
}
