import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import {
  projectDetailsSlotId,
  type PluginSlotInput,
} from '@repo/contracts/plugins/wire';
import {
  slotCounterSnapshot,
  slotCounterWavePatch,
} from '@repo/contracts/plugins/wire-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';

const slotCounterId = 'slot-counter';

const projectDetails = (projectId: string): PluginSlotInput => ({
  slotId: projectDetailsSlotId,
  context: { projectId },
});

it('streams the Slot counter fixture in Project details as the wire fixtures describe and delivers a tap to its handler', async () => {
  const home = await createRuntimePlugins([
    {
      id: slotCounterId,
      fixture: slotCounterId,
      main: 'index.js',
      slots: [projectDetailsSlotId],
    },
  ]);

  const { createCaller } = await startEngineTestHost({
    home,
  });

  const controller = new AbortController();

  const app = createCaller({ signal: controller.signal });

  const messages = (await app.plugins.slot(projectDetails('argo')))[
    Symbol.asyncIterator
  ]();

  expect((await messages.next()).value).toEqual({
    type: 'contributors',
    pluginIds: [slotCounterId],
  });
  const snapshot = (await messages.next()).value;

  expect(snapshot).toMatchObject({
    type: 'view',
    pluginId: slotCounterId,
    message: slotCounterSnapshot,
  });

  await app.plugins.dispatch({
    pluginId: slotCounterId,
    path: snapshot.path,
    revision: 1,
    viewId: snapshot.message.viewId,
    key: '0/1',
    event: 'onPress',
  });

  expect((await messages.next()).value).toMatchObject({
    type: 'view',
    pluginId: slotCounterId,
    message: slotCounterWavePatch,
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
      root: { type: 'Text', props: { children: 'bento frozen' } },
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

it('orders contributors by Plugin id, not by folder', async () => {
  const home = await createRuntimePlugins([
    { id: 'alpha', fixture: 'slot', slots: [projectDetailsSlotId] },
    { id: 'beta', fixture: 'slot', slots: [projectDetailsSlotId] },
  ]);

  await rename(
    join(home, shippedFolder, 'alpha'),
    join(home, shippedFolder, 'zeta'),
  );

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();

  const messages = (
    await createCaller({ signal: controller.signal }).plugins.slot(
      projectDetails('bento'),
    )
  )[Symbol.asyncIterator]();

  expect((await messages.next()).value).toEqual({
    type: 'contributors',
    pluginIds: ['alpha', 'beta'],
  });
  controller.abort();
}, 20_000);
