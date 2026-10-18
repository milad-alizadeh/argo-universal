import type { PluginSurface } from '@repo/contracts/plugins/kit';
import {
  projectDetailsSlotId,
  type SlotMessage,
  type ViewMessage,
} from '@repo/contracts/plugins/wire';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';
import type { AppRouter } from './router';

function app(url: string, initial?: PluginSurface) {
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
    update: (next: PluginSurface) => {
      surface = next;
      socket.connection?.ws?.close();
    },
  };
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
    const views = [phone, desktop, legacy].map(({ client }) => {
      const messages: (ViewMessage | SlotMessage)[] = [];
      const observer = {
        onData: (message: ViewMessage | SlotMessage) => messages.push(message),
      };
      const subscription =
        kind === 'page'
          ? client.plugins.view.subscribe(
              { pluginId: 'surface', path: '/' },
              observer,
            )
          : client.plugins.slot.subscribe(
              {
                slotId: projectDetailsSlotId,
                context: { projectId: 'project-1' },
              },
              observer,
            );
      onTestFinished(() => subscription.unsubscribe());

      return messages;
    });
    const expected = (platform?: string, parts?: Record<string, number>) => ({
      platform,
      parts,
      projectId: kind === 'Slot' ? 'project-1' : undefined,
      frozen: true,
    });
    const rendered = (messages: (ViewMessage | SlotMessage)[]) => {
      const latest = messages
        .map((message) => (message.type === 'view' ? message.message : message))
        .filter((message) => message.type === 'snapshot')
        .at(-1);
      return latest?.type === 'snapshot'
        ? JSON.parse(
            String(latest.root.props['children'] ?? latest.root.props['label']),
          )
        : null;
    };
    await expect
      .poll(() => views.map(rendered), { timeout: 10_000 })
      .toEqual([
        JSON.parse(JSON.stringify(expected('ios', { Text: 1 }))),
        JSON.parse(JSON.stringify(expected('desktop', { Text: 3, Button: 2 }))),
        JSON.parse(JSON.stringify(expected())),
      ]);
    phone.update({ platform: 'ios', parts: { Text: 3, Stack: 1 } });
    await expect
      .poll(() => views.map(rendered), { timeout: 10_000 })
      .toEqual([
        JSON.parse(JSON.stringify(expected('ios', { Text: 3, Stack: 1 }))),
        JSON.parse(JSON.stringify(expected('desktop', { Text: 3, Button: 2 }))),
        JSON.parse(JSON.stringify(expected())),
      ]);
  },
  20_000,
);
