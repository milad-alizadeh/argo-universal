import { lookup } from 'node:dns';
import { request } from 'node:https';
import type { OpenPage } from '@argo/plugin-kit/testing';
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
): Promise<OpenPage> {
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

const shows = (page: OpenPage, text: string): void => {
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

  shows(
    page,
    `Refused: localhost:${port} is not a declared host. Add { "kind": "fetch", "host": "localhost:${port}" } to capabilities in plugin.json.`,
  );
  expect(requested).toEqual([]);
});

it('fetches only one label under the declared suffix on the default port', async () => {
  const { port, requested } = await recordingServer();

  const fixture = await dataFixture(
    `export async function register(argo) {
      async function fetchHost(host) {
        return argo.fetch('https://' + host + '/posts').then(
          (reply) => reply.text(), (error) => error.message,
        );
      }
      argo.operations.register('checkHosts', async () => ({
        allowed: await fetchHost('team.atlassian.net'),
        bare: await fetchHost('atlassian.net'),
        wildcard: await fetchHost('*.atlassian.net'),
        deep: await fetchHost('nested.team.atlassian.net'),
        unrelated: await fetchHost('atlassian.net.evil.example'),
        port: await fetchHost('team.atlassian.net:8443'),
        privateAddress: await fetchHost('private.atlassian.net'),
      }));
    }`,
    {
      operations: [
        {
          name: 'checkHosts',
          label: 'Check hosts',
          description: 'Fetch the fixture hosts.',
          tier: 'read',
          params: {},
        },
      ],
    },
    [{ kind: 'fetch', host: '*.atlassian.net' }],
  );

  const network = await fixtureNetwork();

  const kit = await fixture.start({
    network: {
      ...network,
      lookup: (_hostname, options, callback) =>
        lookup('127.0.0.1', options, callback),
      request: (url, options) =>
        request(
          url.hostname === 'team.atlassian.net'
            ? new URL(`https://127.0.0.1:${port}${url.pathname}`)
            : url,
          { ...options, servername: 'localhost' },
        ),
    },
  });

  const refusedHost = expect.stringContaining('is not a declared host');
  await expect(kit.operations.run({ name: 'checkHosts' })).resolves.toEqual({
    allowed: 'posts',
    bare: refusedHost,
    wildcard: refusedHost,
    deep: refusedHost,
    unrelated: refusedHost,
    port: refusedHost,
    privateAddress: expect.stringContaining('resolves to private address'),
  });
  expect(requested).toEqual(['/posts']);
});
