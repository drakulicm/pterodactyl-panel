import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';
import manifestSRI from 'vite-plugin-manifest-sri';

const panelRoot = path.resolve(import.meta.dirname, '../..');

export default defineConfig({
    envDir: panelRoot,
    build: {
        manifest: 'manifest.json',
        emptyOutDir: true,
        assetsInlineLimit: 0,
    },
    plugins: [
        laravel({
            input: 'src/main.tsx',
            publicDirectory: path.relative(import.meta.dirname, path.join(panelRoot, 'public')),
            buildDirectory: 'build',
            hotFile: path.join(panelRoot, 'public/build/hot'),
            refresh: [path.join(panelRoot, 'resources/views/templates/app.blade.php')],
        }),
        react(),
        tailwindcss(),
        manifestSRI(),
    ],
    resolve: {
        alias: { '@': path.resolve(import.meta.dirname, 'src') },
        dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        cors: true,
    },
});
