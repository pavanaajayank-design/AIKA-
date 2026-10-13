import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  // PNG signature is 8 bytes, IHDR chunk width is at offset 16, height at offset 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

test('PWA manifest exists, is valid JSON, and contains required Android installation fields', () => {
  const manifestPath = path.resolve('public/manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in public directory');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  assert.equal(manifest.name, 'AIKA — Explore on Time');
  
  assert.equal(manifest.short_name, 'AIKA');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#f6f6ef');
  assert.equal(manifest.theme_color, '#152c39');
  assert.equal(manifest.orientation, 'portrait-primary');

  assert.ok(Array.isArray(manifest.icons), 'Manifest must declare icons');
  assert.ok(manifest.icons.length >= 3, 'Manifest must declare at least 192, 512, and maskable icons');

  const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes === '192x192');
  assert.ok(icon192, 'Manifest must declare 192x192 icon');
  assert.equal(icon192.src, '/icons/icon-192x192.png');
  assert.equal(icon192.type, 'image/png');

  const icon512 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose !== 'maskable');
  assert.ok(icon512, 'Manifest must declare 512x512 icon');
  assert.equal(icon512.src, '/icons/icon-512x512.png');
  assert.equal(icon512.type, 'image/png');

  const maskable = manifest.icons.find((i: { purpose?: string }) => i.purpose === 'maskable');
  assert.ok(maskable, 'Manifest must declare a maskable icon');
  assert.equal(maskable.sizes, '512x512');
  assert.equal(maskable.src, '/icons/icon-maskable-512x512.png');
});

test('manifest.json mirror exists for legacy browser compatibility', () => {
  const jsonPath = path.resolve('public/manifest.json');
  assert.ok(fs.existsSync(jsonPath), 'manifest.json must exist in public directory');
  const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.equal(manifest.name, 'AIKA — Explore on Time');
  assert.equal(manifest.short_name, 'AIKA');
});

test('all referenced PWA icon assets exist on disk with correct dimensions', () => {
  const iconChecks = [
    { file: 'public/icons/icon-192x192.png', width: 192, height: 192 },
    { file: 'public/icons/icon-512x512.png', width: 512, height: 512 },
    { file: 'public/icons/icon-maskable-512x512.png', width: 512, height: 512 },
    { file: 'public/icons/apple-touch-icon.png', width: 180, height: 180 },
    { file: 'public/icons/favicon-64x64.png', width: 64, height: 64 },
  ];

  for (const check of iconChecks) {
    const filePath = path.resolve(check.file);
    assert.ok(fs.existsSync(filePath), `Icon file ${check.file} must exist`);
    const buf = fs.readFileSync(filePath);
    const { width, height } = readPngDimensions(buf);
    assert.equal(width, check.width, `${check.file} width should be ${check.width}`);
    assert.equal(height, check.height, `${check.file} height should be ${check.height}`);
  }
});

test('service worker sw.js is configured safely and never caches API, Supabase, or auth data', () => {
  const swPath = path.resolve('public/sw.js');
  assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');

  const swContent = fs.readFileSync(swPath, 'utf8');

  // Must only handle GET requests
  assert.ok(swContent.includes("request.method !== 'GET'"), 'SW must bypass non-GET requests');

  // Must strictly bypass /api/
  assert.ok(swContent.includes("url.pathname.startsWith('/api/')"), 'SW must bypass /api/ endpoints');

  // Must strictly bypass Supabase
  assert.ok(swContent.includes("supabase.co"), 'SW must bypass Supabase endpoints');

  // Must bypass Authorization header
  assert.ok(swContent.includes("Authorization"), 'SW must bypass requests with Authorization header');

  // Must handle navigation requests (network-first)
  assert.ok(swContent.includes("request.mode === 'navigate'"), 'SW must handle navigation requests');

  // Must precache static shell only
  assert.ok(swContent.includes('/manifest.webmanifest'), 'SW precaches manifest');
  assert.ok(swContent.includes('/index.html'), 'SW precaches index.html');
});

test('index.html contains required PWA manifest, theme-color, viewport-fit, and icon links', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('rel="manifest"'), 'index.html must include manifest link');
  assert.ok(html.includes('/manifest.webmanifest'), 'index.html must link to /manifest.webmanifest');
  assert.ok(html.includes('name="theme-color" content="#152c39"'), 'index.html must set theme-color to #152c39');
  assert.ok(html.includes('viewport-fit=cover'), 'index.html must set viewport-fit=cover');
  assert.ok(html.includes('rel="apple-touch-icon"'), 'index.html must include apple-touch-icon');
  assert.ok(html.includes('name="mobile-web-app-capable" content="yes"'), 'index.html must include mobile-web-app-capable');
});
