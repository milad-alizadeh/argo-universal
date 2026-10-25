import { expect, it } from 'vitest';
import { localhost } from '#mocks/fetch-fixture-server';
import { httpsServer } from '#mocks/probe-plugin';
import { runProbe } from '#mocks/probe-run';
import { pluginAssetLimitBytes } from '../assets/content';

it.each([
  {
    name: 'an upstream error page',
    status: 404,
    contentType: 'image/png',
    error: 'Asset request failed (404)',
  },
  {
    name: 'an HTML document',
    status: 200,
    contentType: 'text/html',
    error: 'Unsupported asset media type',
  },
  {
    name: 'unsanitized SVG',
    status: 200,
    contentType: 'image/svg+xml',
    error: 'Unsupported asset media type',
  },
])(
  'does not publish $name as media',
  async ({ status, contentType, error }) => {
    const port = await httpsServer((_request, response) => {
      response.writeHead(status, { 'content-type': contentType });
      response.end('not media');
    });

    const { results } = await runProbe({
      calls: {
        image: `argo.assets.resolve({ url: 'https://localhost:${port}/' })`,
      },
      capabilities: [localhost(port)],
      network: true,
    });

    expect(results).toEqual({ image: { error } });
  },
);

it('refuses a remote media stream over the byte cap without publishing a truncated asset', async () => {
  const port = await httpsServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'video/mp4' });
    response.end(Buffer.alloc(pluginAssetLimitBytes + 1));
  });

  const { results } = await runProbe({
    calls: {
      video: `argo.assets.resolve({ url: 'https://localhost:${port}/' })`,
    },
    capabilities: [localhost(port)],
    network: true,
  });

  expect(results).toEqual({
    video: { error: `Asset exceeds the ${pluginAssetLimitBytes} byte limit` },
  });
});
