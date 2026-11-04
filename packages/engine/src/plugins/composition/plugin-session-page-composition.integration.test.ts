import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, pageAt, textOf } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const sessions = ['session-1', 'session-2'];

it('draws a page for each Session with that Session in its context', async () => {
  const home = await createRuntimePlugins([
    { id: 'surface', fixture: 'surface' },
  ]);

  const { caller } = await startEngineTestHost({ home });

  // The surface fixture draws its context as JSON text.
  const drawn = await Promise.all(
    sessions.map(async (sessionId) =>
      textOf(await drawnRoot(caller, { ...pageAt('surface', '/'), sessionId })),
    ),
  );

  expect(drawn).toEqual(
    sessions.map((sessionId) =>
      JSON.stringify({
        ...currentPluginSurface('web'),
        sessionId,
        frozen: true,
      }),
    ),
  );
}, 20_000);
