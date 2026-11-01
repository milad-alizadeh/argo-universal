import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { localhost } from '#mocks/fetch-fixture-server';
import { journeyMs } from '#mocks/journey-budget';
import { appMediaLoad } from '#mocks/plugin-assets';
import {
  fixtureNetwork,
  httpsServer,
  installed,
  probeResult,
  probeSource,
} from '#mocks/probe-plugin';

// Plugin workers start a real process: budget this file's tests for startup.
vi.setConfig({ testTimeout: journeyMs });

it.each([
  { format: 'png', contentType: 'image/png' },
  { format: 'mp4', contentType: 'video/mp4' },
  { format: 'mp3', contentType: 'audio/mpeg' },
])(
  'proxies private $format media with Plugin credentials and returns only a content-hash reference',
  async ({ format, contentType }) => {
    const requests: {
      authorization: string | undefined;
      cookie: string | undefined;
      forwarded: string | undefined;
    }[] = [];

    const port = await httpsServer((request, response) => {
      requests.push({
        authorization: request.headers.authorization,
        cookie: request.headers.cookie,
        forwarded: request.headers['x-forwarded-for']?.toString(),
      });
      response.writeHead(200, {
        'content-type': contentType,
        'set-cookie': 'private=synthetic',
      });
      response.end(Buffer.from([0, 128, 255]));
    });

    const probe = await installed(
      probeSource({
        image: `argo.assets.resolve({ url: 'https://localhost:${port}/private', headers: { Authorization: 'Bearer synthetic' } })`,
      }),
      { capabilities: [localhost(port)] },
    );

    const { caller, url } = await startEngineTestHost({
      home: probe.home,
      pluginNetwork: await fixtureNetwork(),
    });

    await caller.plugin.activate({ pluginId: 'probe' });

    expect(await probeResult(probe.data)).toEqual({
      image: {
        value: {
          pluginId: 'probe',
          hash: '5240672d7b51756b829ad0ef8d9468b7a078afa2f410484fd3892dab47becb72',
          format,
        },
      },
    });
    expect(requests).toEqual([
      {
        authorization: 'Bearer synthetic',
        cookie: undefined,
        forwarded: undefined,
      },
    ]);

    const response = await fetch(
      `${url}/plugin-assets/probe/5240672d7b51756b829ad0ef8d9468b7a078afa2f410484fd3892dab47becb72.${format}`,
      { headers: appMediaLoad },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(contentType);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from([0, 128, 255]),
    );
    expect(response.headers.get('set-cookie')).toBeNull();
  },
);

it('resolves remote media again after a Plugin is turned off and on', async () => {
  const port = await httpsServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'image/png' });
    response.end(Buffer.from([0, 128, 255]));
  });

  const probe = await installed(
    probeSource({
      image: `argo.assets.resolve({ url: 'https://localhost:${port}/' })`,
    }),
    { capabilities: [localhost(port)] },
  );

  const { caller } = await startEngineTestHost({
    home: probe.home,
    pluginNetwork: await fixtureNetwork(),
  });

  await caller.plugin.activate({ pluginId: 'probe' });
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: false });
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: true });

  expect(await caller.plugin.activate({ pluginId: 'probe' })).toMatchObject({
    state: 'running',
    error: null,
  });
  expect(await probeResult(probe.data)).toMatchObject({
    image: { value: { format: 'png' } },
  });
});
