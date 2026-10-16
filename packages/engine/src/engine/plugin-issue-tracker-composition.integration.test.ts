import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('loads the shipped Issue tracker with its declared Capabilities and starts it with checks on', async () => {
  const { caller } = await startEngineTestHost({
    // The Server's own version, which the shipped Plugins support.
    version: '0.0.0',
    firstPartyPluginsDirectory: fileURLToPath(
      new URL('../../../../plugins', import.meta.url),
    ),
  });

  const result = await caller.plugins.list();

  expect(result.errors).toEqual([]);
  expect(
    result.plugins.find(({ manifest }) => manifest.id === 'issue-tracker'),
  ).toMatchObject({
    firstParty: true,
    manifest: {
      capabilities: expect.arrayContaining([
        {
          kind: 'process:exec',
          command: 'gh',
          args: ['issue', 'close', '*', '--repo', '*'],
        },
      ]),
    },
  });
  expect(
    await caller.plugins.activate({ pluginId: 'issue-tracker' }),
  ).toMatchObject({ state: 'running', error: null });
});
