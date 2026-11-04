import {
  minimumPluginWireVersion,
  currentPluginSurface,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import type { DrawAnswer } from '@repo/contracts/plugins/page-draw';
import type { LiveAnswer } from '@repo/contracts/plugins/page-live';
import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { AppPageSocket } from '#mocks/app-socket';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';
import type { AppRouter } from './router';

type App = {
  client: TRPCClient<AppRouter>;
  update: (surface: Partial<PluginSurface>) => void;
};

// A string is sent as reported, so a test can send a surface that is not JSON.
type Reported = Partial<PluginSurface> | string;

const encoded = (surface: Reported): string =>
  typeof surface === 'string' ? surface : JSON.stringify(surface);

function app(url: string, initial?: Reported): App {
  let surface = initial;

  const socket = createWSClient({
    url: url.replace(/^http/, 'ws'),
    connectionParams: () =>
      surface ? { pluginSurface: encoded(surface) } : {},
    WebSocket: AppPageSocket,
  });

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  onTestFinished(() => socket.close());

  return {
    client,
    update: (next): void => {
      surface = next;
      socket.connection?.ws?.close();
    },
  };
}

// The page is drawn for a Project, as a Project details row's drill-in opens it (ADR-0046).
const address = {
  pluginId: 'surface',
  path: '/',
  pageState: {},
  projectId: 'project-1',
};

function renderedText(root: WireNode): string | null {
  const text = root.props['children'] ?? root.props['label'];

  return typeof text === 'string' ? text : null;
}

const answeredText = (answer: DrawAnswer | LiveAnswer): string | null =>
  answer.kind === 'tree' ? renderedText(answer.root) : answer.kind;

const drawn = async ({ client }: App): Promise<string | null> =>
  answeredText(await client.plugins.draw.query({ ...address, pages: 1 }));

// The live page's subscription: the text of the last tree it answered.
function followed({ client }: App): () => string | null {
  let last: string | null = null;

  const subscription = client.plugins.live.subscribe(
    { ...address, path: '/live' },
    {
      onData: (answer): void => {
        last = answeredText(answer);
      },
    },
  );

  onTestFinished(() => subscription.unsubscribe());

  return () => last;
}

function expected(surface: PluginSurface): string {
  return JSON.stringify({ ...surface, projectId: 'project-1', frozen: true });
}

const updateArgo = 'Update Argo to see this';

const desktop = currentPluginSurface('desktop');

const phoneAtMinimum: PluginSurface = {
  platform: 'ios',
  wireVersion: minimumPluginWireVersion,
};

it('draws a page for an App at the wire minimum and Update Argo for an older or malformed one, including after an update', async () => {
  const home = await createRuntimePlugins([
    { id: 'surface', fixture: 'surface' },
  ]);

  const { url } = await startEngineTestHost({ home });

  // An older App reports no wire version.
  const phone = app(url, { platform: 'ios' });
  const current = app(url, desktop);
  const unreported = app(url);
  // A surface that is not JSON, or has the wrong shape, reports no wire version.
  const notJson = app(url, 'not json');
  const malformed = app(url, '{"platform":"ios","wireVersion":"one"}');
  const apps = [phone, current, unreported, notJson, malformed];

  const older = [updateArgo, updateArgo, updateArgo];

  await expect(Promise.all(apps.map(drawn))).resolves.toEqual([
    updateArgo,
    expected(desktop),
    ...older,
  ]);

  phone.update(phoneAtMinimum);
  await expect
    .poll(() => Promise.all(apps.map(drawn)), { timeout: 10_000 })
    .toEqual([expected(phoneAtMinimum), expected(desktop), ...older]);
}, 20_000);

it('follows a live page for an App at the wire minimum and shows Update Argo to an older one', async () => {
  const home = await createRuntimePlugins([
    { id: 'surface', fixture: 'surface' },
  ]);

  const { url } = await startEngineTestHost({ home });

  const lives = [app(url, { platform: 'ios' }), app(url, desktop)].map(
    followed,
  );

  await expect
    .poll(() => lives.map((last) => last()), { timeout: 10_000 })
    .toEqual([updateArgo, expected(desktop)]);
}, 20_000);
