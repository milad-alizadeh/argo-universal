import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installed } from '#mocks/probe-plugin';

// A page that draws from a Setting, as a sign-in page offers its OAuth button once the app's client ID is set.
const source = `
  export function register(argo) {
    argo.pages.define('/', { load: () => argo.settings.get('client-id'), render: () => null });
  }`;

it('marks the Plugin’s pages stale when a Setting changes, so a page drawn from it draws again', async () => {
  const { home } = await installed(source, {
    settings: [{ key: 'client-id', type: 'secret', label: 'Client ID' }],
  });

  const engine = await startEngineTestHost({ home });
  const controller = new AbortController();

  const marks = (
    await engine.createCaller({ signal: controller.signal }).plugins.stale()
  )[Symbol.asyncIterator]();

  await engine.caller.plugin.activate({ pluginId: 'probe' });
  // The new worker's own mark.
  await marks.next();
  await engine.caller.plugin.setSetting({
    pluginId: 'probe',
    key: 'client-id',
    value: 'client-1',
  });

  expect((await marks.next()).value).toEqual({ pluginId: 'probe' });
  controller.abort();
});
