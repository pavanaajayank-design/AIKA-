import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
    title: 'AIKA — Explore on Time',
    description: 'A thoughtful AI-powered travel companion that helps travellers turn airport layovers into meaningful discoveries while prioritising their next flight.',
    manifest: '/manifest.webmanifest',
    icons: {
        icon: [
            { url: '/icons/favicon-64x64.png', sizes: '64x64', type: 'image/png' },
            { url: '/images/aika-logo.png', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'AIKA',
    },
    applicationName: 'AIKA',
};

export const viewport: Viewport = {
    themeColor: '#152c39',
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
