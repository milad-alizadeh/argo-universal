import { currentPartVersions } from '@repo/contracts/plugins/kit';
import { ViewMessage, type PartEvent } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { connectPluginApp } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const page = { pluginId: 'overlays', path: '/' };

async function overlayApp(): Promise<ReturnType<typeof connectPluginApp>> {
  const home = await createRuntimePlugins([
    { id: page.pluginId, fixture: 'overlay-actions' },
  ]);

  const { url } = await startEngineTestHost({ home });

  const app = connectPluginApp(url, page, currentPartVersions);

  await expect.poll(() => app.messages.length, { timeout: 10_000 }).toBe(1);

  return app;
}

type App = Awaited<ReturnType<typeof overlayApp>>;

async function dispatch(
  app: App,
  event: { key: string } & PartEvent,
): Promise<void> {
  const latest = ViewMessage.parse(app.messages.at(-1));

  if (!latest.viewId) throw new Error('Expected view identity');
  const { viewId, revision } = latest;
  await app.client.plugins.dispatch.mutate({
    ...page,
    viewId,
    revision,
    ...event,
  });
}

const latestText = (app: App): string => JSON.stringify(app.messages.at(-1));

it(
  'opens an overlay node and delivers its Part events to the Plugin',
  { timeout: 20_000 },
  async () => {
    const app = await overlayApp();
    await dispatch(app, { key: '0/open', event: 'onPress' });
    await expect
      .poll(() => latestText(app), { timeout: 10_000 })
      .toContain('"open":true');
    await dispatch(app, { key: '0/sheet/apply', event: 'onPress' });
    await expect
      .poll(() => latestText(app), { timeout: 10_000 })
      .toContain('Confirmed');
    await expect(
      dispatch(app, { key: '0/sheet', event: 'onOpenChange', payload: 'no' }),
    ).rejects.toThrow('Invalid Plugin event payload');
    await dispatch(app, {
      key: '0/sheet',
      event: 'onOpenChange',
      payload: false,
    });
    await expect
      .poll(() => latestText(app), { timeout: 10_000 })
      .toContain('Dismissed');
  },
);
