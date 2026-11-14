import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { WebSocket as NodeWebSocket } from 'ws';
import { startEngineTestHost } from '#mocks/engine';
import { type TestDevice, connectAsDevice } from '#mocks/engine-channel';
import { probeSettings } from '#mocks/plugin-settings';
import { installed } from '#mocks/probe-plugin';
import type { AppRouter } from '../../engine/router';
import { connectChannel } from '../../pairing/connect-channel';

const accountHost = 'api.fixture.test';

it('draws sign-in inventory and secret Settings without starting the providing Plugin', async () => {
  const accounts = [{ host: accountHost, page: '/sign-in' }];

  const { home } = await installed(
    "export function register() { throw new Error('Settings must not start this Plugin'); }",
    {
      accounts,
      settings: probeSettings,
      capabilities: [{ kind: 'fetch', host: accountHost }],
    },
  );

  const { caller } = await startEngineTestHost({ home });
  expect(await caller.plugins.accounts.list()).toEqual([]);
  expect(await caller.plugin.getSettings({ pluginId: 'probe' })).toMatchObject({
    secretsSet: [],
  });
  expect((await caller.plugin.list()).plugins).toContainEqual(
    expect.objectContaining({
      manifest: expect.objectContaining({
        contributes: expect.objectContaining({ accounts }),
      }),
      state: 'not-started',
    }),
  );
});

it('lets a Paired Device read sign-in rows and lets the sign-in page decide what that Device can finish', async () => {
  const { home } = await installed(
    `
    import { Text } from '@argo/plugin-kit';
    import { jsx } from '@argo/plugin-kit/jsx-runtime';
    export function register(argo) {
      argo.pages.define('/sign-in', {
        load: ({ context }) => context.serverDevice,
        render: (serverDevice) => jsx(Text, { children: serverDevice ? 'Server Device sign-in' : 'Paired Device sign-in' }),
      });
    }
  `,
    {
      accounts: [{ host: accountHost, page: '/sign-in' }],
      capabilities: [{ kind: 'fetch', host: accountHost }],
      settings: probeSettings,
    },
  );

  const engine = await startEngineTestHost({ home });
  const { ticket } = engine.pairing.mint();

  const device = await connectAsDevice(engine, {
    ticket,
    name: 'Phone',
    platform: 'ios',
  });

  expect(await device.caller.plugins.accounts.list.query()).toEqual([]);
  expect(
    await device.caller.plugin.getSettings.query({ pluginId: 'probe' }),
  ).toMatchObject({ secretsSet: [] });
  expect(await device.caller.plugin.list.query()).toMatchObject({
    plugins: [
      {
        state: 'not-started',
        manifest: {
          contributes: {
            accounts: [{ host: accountHost, page: '/sign-in' }],
          },
        },
      },
    ],
  });

  const app = await pairedPluginApp(device);

  expect(
    await app.plugins.draw.query({
      pluginId: 'probe',
      path: '/sign-in',
      pageState: {},
      pages: 1,
    }),
  ).toMatchObject({
    kind: 'tree',
    root: { type: 'Text', props: { children: 'Paired Device sign-in' } },
  });
}, 30_000);

async function pairedPluginApp(
  device: TestDevice,
): Promise<ReturnType<typeof createTRPCClient<AppRouter>>> {
  const { socket } = await connectChannel(device.channel);

  const socketConstructor = new Proxy(globalThis.WebSocket, {
    construct: (_target, [url]): WebSocket =>
      Reflect.construct(NodeWebSocket, [
        url,
        { createConnection: (): typeof socket => socket },
      ]),
  });

  const connection = createWSClient({
    url: 'ws://127.0.0.1',
    WebSocket: socketConstructor,
    connectionParams: {
      pluginSurface: JSON.stringify(currentPluginSurface('ios')),
    },
  });

  onTestFinished(() => connection.close());

  return createTRPCClient<AppRouter>({
    links: [wsLink({ client: connection })],
  });
}
