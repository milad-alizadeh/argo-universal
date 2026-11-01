import {
  minimumPluginWireVersion,
  currentPluginSurface,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
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

// The page is watched for a Project, as a Project details row's drill-in opens it (ADR-0046).
function watch({ client }: App): ViewMessage[] {
  const messages: ViewMessage[] = [];

  const subscription = client.plugins.view.subscribe(
    { pluginId: 'surface', path: '/', projectId: 'project-1' },
    { onData: (message: ViewMessage): void => void messages.push(message) },
  );

  onTestFinished(() => subscription.unsubscribe());

  return messages;
}

function rendered(messages: ViewMessage[]): string | null {
  const latest = messages.findLast((message) => message.type === 'snapshot');

  return latest ? renderedText(latest.root) : null;
}

function renderedText(root: WireNode): string | null {
  const text = root.props['children'] ?? root.props['label'];

  return typeof text === 'string' ? text : null;
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

  const views = [phone, current, unreported, notJson, malformed].map((viewer) =>
    watch(viewer),
  );

  await expect
    .poll(() => views.map(rendered), { timeout: 10_000 })
    .toEqual([
      updateArgo,
      expected(desktop),
      updateArgo,
      updateArgo,
      updateArgo,
    ]);
  phone.update(phoneAtMinimum);
  await expect
    .poll(() => views.map(rendered), { timeout: 10_000 })
    .toEqual([
      expected(phoneAtMinimum),
      expected(desktop),
      updateArgo,
      updateArgo,
      updateArgo,
    ]);
}, 20_000);
