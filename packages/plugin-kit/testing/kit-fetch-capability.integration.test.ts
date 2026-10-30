import type { PluginTestView } from '@argo/plugin-kit/testing';
import type { PluginCapability } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { localhost } from '../../engine/mocks/fetch-fixture-server';
import { fixtureNetwork, httpsServer } from '../../engine/mocks/probe-plugin';
import { dataFixture } from '../mocks/data-fixture';
import { pluginTestTimeoutMs } from './test-timeout';

type Recorded = { port: number; requested: string[] };

// Records what reached the server, so a refusal can be told from a request that merely failed.
async function recordingServer(): Promise<Recorded> {
  const requested: string[] = [];

  const port = await httpsServer(({ url }, response) => {
    requested.push(url ?? '');
    response.end('posts');
  });

  return { port, requested };
}

// A Plugin whose only page shows the answer, or the refusal, of one fetch Query at the server.
async function postsPage(
  port: number,
  capabilities: PluginCapability[],
): Promise<PluginTestView> {
  const fixture = await dataFixture(
    `import { Text, useData } from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.register('/', () => {
        const { data, error } = useData({ api: 'fetch', url: 'https://localhost:${port}/posts' });
        return <Text>{error ?? (data ? data.status + ':' + data.body : 'empty')}</Text>;
      });
    }`,
    {},
    capabilities,
  );

  return (await fixture.start({ network: await fixtureNetwork() })).page();
}

// Starting a Plugin host and answering over TLS outruns the view's own wait on a busy Mac.
async function shows(page: PluginTestView, text: string): Promise<void> {
  await expect
    .poll(() => page.findText(text), { timeout: pluginTestTimeoutMs })
    .toBeDefined();
}

it('answers a page fetching the host its manifest declares', async () => {
  const { port, requested } = await recordingServer();

  const page = await postsPage(port, [localhost(port)]);

  await shows(page, '200:posts');
  expect(requested).toEqual(['/posts']);
});

it('refuses a page fetching a host its manifest does not declare', async () => {
  const { port, requested } = await recordingServer();

  const page = await postsPage(port, [
    { kind: 'fetch', host: 'example.com', reason: 'Some other host' },
  ]);

  await shows(page, `Refused: localhost:${port} is not a declared host`);
  expect(requested).toEqual([]);
});
