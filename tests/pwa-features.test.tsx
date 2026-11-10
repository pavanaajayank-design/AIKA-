import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import PwaInstallBanner from '../src/features/pwa/PwaInstallBanner';
import PwaIOSGuideModal from '../src/features/pwa/PwaIOSGuideModal';
import PwaOfflineBanner from '../src/features/pwa/PwaOfflineBanner';
import PwaUpdateToast from '../src/features/pwa/PwaUpdateToast';
import { PwaProvider } from '../src/features/pwa/PwaContext';

test('manifest.webmanifest contains categories and app shortcuts for native quick actions', () => {
    const raw = fs.readFileSync(path.resolve('public/manifest.webmanifest'), 'utf8');
    const manifest = JSON.parse(raw);

    assert.ok(Array.isArray(manifest.categories), 'Manifest should have categories array');
    assert.ok(manifest.categories.includes('travel'));

    assert.ok(Array.isArray(manifest.shortcuts), 'Manifest should declare quick shortcuts');
    assert.ok(manifest.shortcuts.length >= 2, 'Manifest should have at least 2 shortcuts');

    const planShortcut = manifest.shortcuts.find((s: { name: string }) => s.name === 'Plan Layover');
    assert.ok(planShortcut, 'Must have Plan Layover shortcut');
    assert.equal(planShortcut.url, '/#planner');

    const tripsShortcut = manifest.shortcuts.find((s: { name: string }) => s.name === 'My Trips');
    assert.ok(tripsShortcut, 'Must have My Trips shortcut');
    assert.equal(tripsShortcut.url, '/#trips');
});

test('manifest.webmanifest contains maskable 192x192 icon', () => {
    const raw = fs.readFileSync(path.resolve('public/manifest.webmanifest'), 'utf8');
    const manifest = JSON.parse(raw);

    const maskable192 = manifest.icons.find(
        (i: { sizes: string; purpose?: string }) => i.sizes === '192x192' && i.purpose === 'maskable'
    );
    assert.ok(maskable192, 'Manifest must declare 192x192 maskable icon');
    assert.equal(maskable192.src, '/icons/icon-maskable-192x192.png');
});

test('PwaInstallBanner renders cleanly inside PwaProvider or falls back safely in SSR', () => {
    // In SSR without browser prompt, banner returns null to prevent layout shifts
    const html = renderToStaticMarkup(
        <PwaProvider>
            <PwaInstallBanner />
        </PwaProvider>
    );
    assert.equal(html, '');
});

test('PwaOfflineBanner renders fallback cleanly in SSR', () => {
    const html = renderToStaticMarkup(
        <PwaProvider>
            <PwaOfflineBanner />
        </PwaProvider>
    );
    // In SSR online is true by default
    assert.equal(html, '');
});

test('PwaIOSGuideModal renders fallback cleanly in SSR', () => {
    const html = renderToStaticMarkup(
        <PwaProvider>
            <PwaIOSGuideModal />
        </PwaProvider>
    );
    assert.equal(html, '');
});

test('PwaUpdateToast renders fallback cleanly in SSR', () => {
    const html = renderToStaticMarkup(
        <PwaProvider>
            <PwaUpdateToast />
        </PwaProvider>
    );
    assert.equal(html, '');
});

