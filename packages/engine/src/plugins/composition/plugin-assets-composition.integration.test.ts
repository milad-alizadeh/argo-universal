import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  appOrigin,
  assetProbe,
  image,
  imageReference,
} from '#mocks/plugin-assets';
import { probeResult } from '#mocks/probe-plugin';

it('serves a Plugin file as immutable bytes from its content-hash URL', async () => {
  const { probe, assetUrl } = await assetProbe();
  expect(await probeResult(probe.data)).toEqual({
    image: { value: imageReference },
  });

  const response = await fetch(assetUrl, { headers: appOrigin });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/png');
  const cacheControl = response.headers.get('cache-control');

  expect(cacheControl).toMatch(/\bprivate\b/);
  expect(cacheControl).toMatch(/\bimmutable\b/);
  expect(cacheControl).toMatch(/\bmax-age=[1-9]/);
  expect(Buffer.from(await response.arrayBuffer())).toEqual(image);
});

it('keeps an old hash immutable after the file changes and the Server restarts', async () => {
  const { probe, assetUrl, stop } = await assetProbe();
  await stop();
  await writeFile(join(probe.code, 'avatar.png'), Buffer.from([0, 128, 255]));
  const { caller, url } = await startEngineTestHost({ home: probe.home });
  await caller.plugin.activate({ pluginId: 'probe' });

  expect(await probeResult(probe.data)).toEqual({
    image: {
      value: {
        ...imageReference,
        hash: '5240672d7b51756b829ad0ef8d9468b7a078afa2f410484fd3892dab47becb72',
      },
    },
  });

  const response = await fetch(`${url}${new URL(assetUrl).pathname}`, {
    headers: appOrigin,
  });

  expect(Buffer.from(await response.arrayBuffer())).toEqual(image);
});

it('answers a matching content hash without retransmitting the body', async () => {
  const { assetUrl } = await assetProbe();

  const response = await fetch(assetUrl, {
    headers: { ...appOrigin, 'if-none-match': `"${imageReference.hash}"` },
  });

  expect(response.status).toBe(304);
  expect(await response.text()).toBe('');
});
