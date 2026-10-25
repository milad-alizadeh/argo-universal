import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  defaultHost,
  probeSettings,
  settingsProbe,
  showClosed,
} from '#mocks/plugin-settings';
import { createRuntimePlugins, writePlugin } from '#mocks/runtime-plugins';

// The update turns `show-closed` into text and drops the `created` sort.
const updatedSettings = probeSettings.map((field) => {
  if (field.key === showClosed)
    return { key: showClosed, type: 'text' as const, label: field.label };

  if (field.type !== 'picker') return field;

  return { ...field, options: field.options.slice(0, 1) };
});

it('answers the default for a saved value a Plugin update no longer takes', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const first = await startEngineTestHost({ home });

  await first.caller.plugins.setSetting({
    pluginId: 'probe',
    key: showClosed,
    value: true,
  });
  await first.caller.plugins.setSetting({
    pluginId: 'probe',
    key: 'sort',
    value: 'created',
  });
  await first.stop();
  await writePlugin(home, { ...settingsProbe, settings: updatedSettings });

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugins.settings({ pluginId: 'probe' })).toEqual({
    values: { host: defaultHost, sort: 'updated' },
    secretsSet: [],
  });
});

it('answers the default for a setting named like an object property', async () => {
  const home = await createRuntimePlugins([
    {
      ...settingsProbe,
      settings: [{ key: 'constructor', type: 'text', label: 'Constructor' }],
    },
  ]);

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugins.settings({ pluginId: 'probe' })).toEqual({
    values: {},
    secretsSet: [],
  });
});
