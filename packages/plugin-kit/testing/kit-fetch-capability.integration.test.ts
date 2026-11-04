import type { PageView } from '@argo/plugin-kit/testing';
import type { PluginCapability } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { localhost } from '../../engine/mocks/fetch-fixture-server';
import { fixtureNetwork, httpsServer } from '../../engine/mocks/probe-plugin';
import { dataFixture } from '../mocks/data-fixture';

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
): Promise<PageView> {
  const fixture = await dataFixture(
    `import { Text } from '@argo/plugin-kit';
    const posts = { api: 'fetch', url: 'https://localhost:${port}/posts' };
    export function register(argo) {
      argo.pages.define('/', {
        load: ({ read }) => read(posts).then((data) => data.status + ':' + data.body, (error) => error.message),
        render: (text) => <Text>{text}</Text>,
      });
    }`,
    {},
    capabilities,
  );

  return (await fixture.start({ network: await fixtureNetwork() })).pages.open({
    path: '/',
  });
}

const shows = (page: PageView, text: string): void => {
  expect(page.findText(text)).toBeDefined();
};

it('answers a page fetching the host its manifest declares', async () => {
  const { port, requested } = await recordingServer();

  const page = await postsPage(port, [localhost(port)]);

  shows(page, '200:posts');
  expect(requested).toEqual(['/posts']);
});

it('refuses a page fetching a host its manifest does not declare', async () => {
  const { port, requested } = await recordingServer();

  const page = await postsPage(port, [
    { kind: 'fetch', host: 'example.com', reason: 'Some other host' },
  ]);

  shows(page, `Refused: localhost:${port} is not a declared host`);
  expect(requested).toEqual([]);
});
