import {
  type SessionHeaderAction,
  sessionHeaderSlotId,
  type SessionWorkbenchCard,
  sessionWorkbenchSlotId,
} from '@repo/contracts/plugins/declared-slots';
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

  await caller.plugin.setEnabled({ pluginId: 'coverage', enabled: false });

  expect(
    await caller.plugins.declared({ slotId: sessionHeaderSlotId }),
  ).toEqual([
    { pluginId: 'deploys', item: action('deploy', 'header') },
    { pluginId: 'tracker', item: action('issue', 'header') },
    { pluginId: 'tracker', item: action('board', 'menu') },
  ]);

  const { plugins } = await caller.plugin.list();

  expect(plugins.every(({ state }) => state === 'not-started')).toBe(true);
  expect(plugins).toHaveLength(3);
});

const card = (id: string): SessionWorkbenchCard => ({
  id,
  title: id,
  icon: { material: 'confirmation_number' },
  page: `/${id}`,
  tab: `/${id}/full`,
});

const declaringCard = (
  id: string,
  order: number,
  cards: SessionWorkbenchCard[],
): Parameters<typeof createRuntimePlugins>[0][number] => ({
  id,
  fixture: 'healthy',
  order,
  declared: { [sessionWorkbenchSlotId]: cards },
});

it('serves Workbench cards in Plugin order, without starting a Plugin', async () => {
  const home = await createRuntimePlugins([
    declaringCard('tracker', 2, [card('issue')]),
    declaringCard('deploys', 1, [card('deploy')]),
  ]);

  const { caller } = await startEngineTestHost({ home });

  expect(
    await caller.plugins.declared({ slotId: sessionWorkbenchSlotId }),
  ).toEqual([
    { pluginId: 'deploys', item: card('deploy') },
    { pluginId: 'tracker', item: card('issue') },
  ]);

  const { plugins } = await caller.plugin.list();

  expect(plugins.every(({ state }) => state === 'not-started')).toBe(true);
});

it('serves a header action that opens the Plugin’s own Workbench card', async () => {
  const opener: SessionHeaderAction = {
    ...action('issue', 'header'),
    target: { type: 'card', cardId: 'issue' },
  };

  const home = await createRuntimePlugins([
    {
      id: 'tracker',
      fixture: 'healthy',
      declared: {
        [sessionHeaderSlotId]: [opener],
        [sessionWorkbenchSlotId]: [card('issue')],
      },
    },
  ]);

  const { caller } = await startEngineTestHost({ home });

  expect(
    await caller.plugins.declared({ slotId: sessionHeaderSlotId }),
  ).toEqual([{ pluginId: 'tracker', item: opener }]);
});
