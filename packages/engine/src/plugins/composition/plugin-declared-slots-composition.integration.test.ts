import {
  type SessionHeaderAction,
  sessionHeaderSlotId,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const action = (
  id: string,
  placement: SessionHeaderAction['placement'],
): SessionHeaderAction => ({
  id,
  label: id,
  icon: { material: 'confirmation_number' },
  placement,
  target: { type: 'page', path: `/${id}` },
});

const declaring = (
  id: string,
  order: number,
  actions: SessionHeaderAction[],
): Parameters<typeof createRuntimePlugins>[0][number] => ({
  id,
  fixture: 'healthy',
  order,
  declared: { [sessionHeaderSlotId]: actions },
});

it('serves Session header actions in Plugin order, without starting a Plugin, and drops a Plugin turned off', async () => {
  const home = await createRuntimePlugins([
    declaring('tracker', 2, [
      action('issue', 'header'),
      action('board', 'menu'),
    ]),
    declaring('deploys', 1, [action('deploy', 'header')]),
    declaring('coverage', 1, [action('report', 'menu')]),
  ]);

  const { caller } = await startEngineTestHost({ home });

  await caller.plugins.setEnabled({ pluginId: 'coverage', enabled: false });

  expect(
    await caller.plugins.declared({ slotId: sessionHeaderSlotId }),
  ).toEqual([
    { pluginId: 'deploys', item: action('deploy', 'header') },
    { pluginId: 'tracker', item: action('issue', 'header') },
    { pluginId: 'tracker', item: action('board', 'menu') },
  ]);

  const { plugins } = await caller.plugins.list();

  expect(plugins.map(({ state }) => state)).toEqual([
    'not-started',
    'not-started',
    'not-started',
  ]);
});
