import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const sessions = ['session-1', 'session-2'];

// The surface fixture draws its context as JSON text.
type Snapshot = Extract<ViewMessage, { type: 'snapshot' }>;

const isSnapshot = (message: ViewMessage): message is Snapshot =>
  message.type === 'snapshot';

function drawn(messages: ViewMessage[]): string | null {
  const text = messages.findLast(isSnapshot)?.root.props['children'];

  return typeof text === 'string' ? text : null;
}

it('opens a page for each Session with that Session in its context', async () => {
  const home = await createRuntimePlugins([
    { id: 'surface', fixture: 'surface' },
  ]);

  const { url } = await startEngineTestHost({ home });

  const apps = sessions.map((sessionId) =>
    connectPluginApp(url, { pluginId: 'surface', path: '/', sessionId }),
  );

  await expect
    .poll(() => apps.map(({ messages }) => drawn(messages)), {
      timeout: 10_000,
    })
    .toEqual(
      sessions.map((sessionId) =>
        JSON.stringify({
          ...currentPluginSurface('web'),
          sessionId,
          frozen: true,
        }),
      ),
    );
}, 20_000);
