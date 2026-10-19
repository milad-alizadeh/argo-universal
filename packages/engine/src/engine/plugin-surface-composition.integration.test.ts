import {
  minimumPluginWireVersion,
  pluginWireVersion,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import {
  projectDetailsSlotId,
  type SlotMessage,
  type ViewMessage,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';
import type { AppRouter } from './router';

type RenderKind = 'page' | 'Slot';

type App = {
  client: TRPCClient<AppRouter>;
  update: (surface: Partial<PluginSurface>) => void;
};

function app(url: string, initial?: Partial<PluginSurface>): App {
  let surface = initial;

  const socket = createWSClient({
    url: url.replace(/^http/, 'ws'),
    connectionParams: () =>
      surface ? { pluginSurface: JSON.stringify(surface) } : {},
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

function record(
  messages: ViewMessage[],
  message: ViewMessage | SlotMessage,
): void {
  if (message.type === 'view') messages.push(message.message);
  else if (message.type !== 'contributors') messages.push(message);
}

function watch({ client }: App, kind: RenderKind): ViewMessage[] {
  const messages: ViewMessage[] = [];

  const observer = {
    onData: (message: ViewMessage | SlotMessage): void =>
      record(messages, message),
  };

  const subscription =
    kind === 'page'
      ? client.plugins.view.subscribe(
          { pluginId: 'surface', path: '/' },
          observer,
        )
      : client.plugins.slot.subscribe(
          { slotId: projectDetailsSlotId, context: { projectId: 'project-1' } },
          observer,
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

function expected(kind: RenderKind, surface: PluginSurface): string {
  return JSON.stringify({
    ...surface,
    projectId: kind === 'Slot' ? 'project-1' : undefined,
    frozen: true,
  });
}

const updateArgo = 'Update Argo to see this';

const desktop: PluginSurface = {
  platform: 'desktop',
  wireVersion: pluginWireVersion,
};

const phoneAtMinimum: PluginSurface = {
  platform: 'ios',
  wireVersion: minimumPluginWireVersion,
};

it.each(['page', 'Slot'] as const)(
  'draws each %s for an App at the wire minimum and Update Argo for an older one, including after an update',
  async (kind) => {
    const home = await createRuntimePlugins([
      { id: 'surface', fixture: 'surface', slots: [projectDetailsSlotId] },
    ]);

    const { url } = await startEngineTestHost({ home });

    // An older App reports no wire version.
    const phone = app(url, { platform: 'ios' });
    const current = app(url, desktop);
    const legacy = app(url);

    const views = [phone, current, legacy].map((viewer) => watch(viewer, kind));

    await expect
      .poll(() => views.map(rendered), { timeout: 10_000 })
      .toEqual([updateArgo, expected(kind, desktop), updateArgo]);
    phone.update(phoneAtMinimum);
    await expect
      .poll(() => views.map(rendered), { timeout: 10_000 })
      .toEqual([
        expected(kind, phoneAtMinimum),
        expected(kind, desktop),
        updateArgo,
      ]);
  },
  20_000,
);
