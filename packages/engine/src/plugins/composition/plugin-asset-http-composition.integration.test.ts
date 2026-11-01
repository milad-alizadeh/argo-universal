import { expect, it } from 'vitest';
import {
  appOrigin,
  assetProbe,
  image,
  imageReference,
} from '#mocks/plugin-assets';

it.each([
  { name: 'web', origin: 'http://localhost:8081' },
  { name: 'desktop', origin: 'app://app' },
])('allows the $name App to read media across origins', async ({ origin }) => {
  const { assetUrl } = await assetProbe();
  const response = await fetch(assetUrl, { headers: { origin } });

  expect(response.status).toBe(200);
  expect(response.headers.get('access-control-allow-origin')).toBe(origin);
  expect(response.headers.get('vary')).toBe('Origin');
  expect(Buffer.from(await response.arrayBuffer())).toEqual(image);
});

it('refuses a foreign Origin before serving an asset', async () => {
  const { assetUrl } = await assetProbe();

  const response = await fetch(assetUrl, {
    headers: { origin: 'https://evil.example' },
  });

  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: 'Forbidden' });
});

it('stops serving a Plugin asset when the Plugin is turned off', async () => {
  const { caller, assetUrl } = await assetProbe();
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: false });
  const response = await fetch(assetUrl, { headers: appOrigin });

  expect(response.status).toBe(404);
});

it.each([
  { range: 'bytes=0-2', expected: image.subarray(0, 3), bounds: '0-2' },
  { range: 'bytes=-3', expected: image.subarray(-3), bounds: '65-67' },
  { range: 'bytes=65-', expected: image.subarray(65), bounds: '65-67' },
])(
  'serves $range for native media seeking',
  async ({ range, expected, bounds }) => {
    const { assetUrl } = await assetProbe();

    const response = await fetch(assetUrl, {
      headers: { ...appOrigin, range },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe(`bytes ${bounds}/68`);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(expected);
  },
);

it('answers HEAD without sending bytes', async () => {
  const { assetUrl } = await assetProbe();
  const head = await fetch(assetUrl, { method: 'HEAD', headers: appOrigin });

  expect(head.status).toBe(200);
  expect(head.headers.get('content-length')).toBe('68');
  expect(head.headers.get('etag')).toBe(`"${imageReference.hash}"`);
  expect(await head.text()).toBe('');
});

it('rejects an unsatisfiable range', async () => {
  const { assetUrl } = await assetProbe();

  const response = await fetch(assetUrl, {
    headers: { ...appOrigin, range: 'bytes=999-' },
  });

  expect(response.status).toBe(416);
  expect(response.headers.get('content-range')).toBe('bytes */68');
  expect(await response.text()).toBe('');
});
