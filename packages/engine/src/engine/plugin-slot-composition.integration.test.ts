import { fileURLToPath } from 'node:url';
import {
  projectDetailsSlotId,
  type PluginSlotInput,
} from '@repo/contracts/plugins/wire';
import {
  helloSlotSnapshot,
  helloSlotWaveEventId,
  helloSlotWavePatch,
} from '@repo/contracts/plugins/wire-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const examples = fileURLToPath(
  new URL('../../../../plugins/examples', import.meta.url),
);

const projectDetails = (projectId: string): PluginSlotInput => ({
  slotId: projectDetailsSlotId,
  context: { projectId },
});

it('streams hello in Project details as the wire fixtures describe and delivers a tap to its handler', async () => {
  const home = await createRuntimePlugins([]);

  const { caller, createCaller } = await startEngineTestHost({
    home,
    // The Server's own version, which `plugins/examples/hello` supports.
    version: '0.0.0',
    firstPartyPluginsDirectory: examples,
  });

  const controller = new AbortController();

  const messages = (
    await createCaller({ signal: controller.signal }).plugins.slot(
      projectDetails('argo'),
    )
  )[Symbol.asyncIterator]();

  expect((await messages.next()).value).toEqual({
    type: 'contributors',
    pluginIds: ['hello'],
  });
  const snapshot = (await messages.next()).value;

  expect(snapshot).toMatchObject({
    type: 'view',
    pluginId: 'hello',
    message: helloSlotSnapshot,
  });

  await caller.plugins.dispatch({
    pluginId: 'hello',
    path: snapshot.path,
    eventId: helloSlotWaveEventId,
  });

  expect((await messages.next()).value).toMatchObject({
    type: 'view',
    pluginId: 'hello',
    message: helloSlotWavePatch,
  });
  controller.abort();
}, 20_000);

it('draws only Plugins that declare the Slot, each with a frozen context', async () => {
  const home = await createRuntimePlugins([
    { id: 'declared', fixture: 'slot', slots: [projectDetailsSlotId] },
    { id: 'undeclared', fixture: 'slot' },
  ]);

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();

  const messages = (
    await createCaller({ signal: controller.signal }).plugins.slot(
      projectDetails('bento'),
    )
  )[Symbol.asyncIterator]();

  expect((await messages.next()).value).toEqual({
    type: 'contributors',
    pluginIds: ['declared'],
  });
  expect((await messages.next()).value).toMatchObject({
    type: 'view',
    pluginId: 'declared',
    message: {
      type: 'snapshot',
      root: { type: 'Text', props: { label: 'bento frozen' } },
    },
  });
  controller.abort();
}, 20_000);

it('ends at once with no contributors when no Plugin declares the Slot', async () => {
  const home = await createRuntimePlugins([
    { id: 'undeclared', fixture: 'slot' },
  ]);

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  const messages = [];

  for await (const message of await createCaller({
    signal: controller.signal,
  }).plugins.slot(projectDetails('bento')))
    messages.push(message);

  expect(messages).toEqual([{ type: 'contributors', pluginIds: [] }]);
  controller.abort();
}, 20_000);
