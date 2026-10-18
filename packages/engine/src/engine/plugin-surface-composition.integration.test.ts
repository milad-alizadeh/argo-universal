import type { PluginSurface } from '@repo/contracts/plugins/kit';
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
  update: (surface: PluginSurface) => void;
};

function app(url: string, initial?: PluginSurface): App {
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

function expected(kind: RenderKind, surface?: PluginSurface): string {
  return JSON.stringify({
    ...surface,
    projectId: kind === 'Slot' ? 'project-1' : undefined,
    frozen: true,
  });
}

it.each(['page', 'Slot'] as const)(
  'gives each %s render its App surface, including after an update',
  async (kind) => {
    const home = await createRuntimePlugins([
      { id: 'surface', fixture: 'surface', slots: [projectDetailsSlotId] },
    ]);

    const { url } = await startEngineTestHost({ home });

    const phone = app(url, { platform: 'ios', parts: { Text: 1 } });

    const desktop = app(url, {
      platform: 'desktop',
      parts: { Text: 3, Button: 2 },
    });

    const legacy = app(url);

    const views = [phone, desktop, legacy].map((viewer) => watch(viewer, kind));

    await expect
      .poll(() => views.map(rendered), { timeout: 10_000 })
      .toEqual([
        expected(kind, { platform: 'ios', parts: { Text: 1 } }),
        expected(kind, { platform: 'desktop', parts: { Text: 3, Button: 2 } }),
        expected(kind),
      ]);
    phone.update({ platform: 'ios', parts: { Text: 3, Stack: 1 } });
    await expect
      .poll(() => views.map(rendered), { timeout: 10_000 })
      .toEqual([
        expected(kind, { platform: 'ios', parts: { Text: 3, Stack: 1 } }),
        expected(kind, { platform: 'desktop', parts: { Text: 3, Button: 2 } }),
        expected(kind),
      ]);
  },
  20_000,
);
