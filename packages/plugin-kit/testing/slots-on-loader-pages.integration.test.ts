import type { PluginTest } from '@argo/plugin-kit/testing';
import { toolCallSlotId } from '@repo/contracts/plugins/replaceable';
import { toolCallSlotFixture } from '@repo/contracts/plugins/replaceable-fixtures';
import type { SlotItems } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { dataFixture, dataPluginId } from '../mocks/data-fixture';

const rowSlotId = 'argo/session/row/v1';

const workbenchSlotId = 'argo/session/workbench/v1';

const bump = {
  name: 'bump',
  label: 'Bump the count',
  description: 'Adds one to the count.',
  tier: 'act' as const,
  params: {},
};

/*
 * One count read by a Loader page, a Workbench card page and a Session row item. `/bump` changes it
 * without an Operation and says so with `argo.changed()`; the `bump` Operation changes it by running.
 */
const source = `import { Text } from '@argo/plugin-kit';
let count = 0;
export function register(argo) {
  argo.operations.register('bump', async () => ({ count: ++count }));
  argo.pages.define('/', { load: () => count, render: (seen) => <Text>{'Count ' + seen}</Text> });
  argo.pages.define('/bump', {
    load: () => { count += 1; argo.changed(); return count; },
    render: (seen) => <Text>{'Bumped ' + seen}</Text>,
  });
  argo.pages.define('/card', {
    load: async ({ context: { projectId, sessionId, surface } }) => ({ projectId, sessionId, platform: surface?.platform }),
    render: ({ projectId, sessionId, platform }) => <Text>{projectId + '/' + sessionId + ' on ' + platform}</Text>,
  });
  argo.slots.register('${rowSlotId}', async ({ contexts }) =>
    Object.fromEntries(contexts.map(({ sessionId }) => [sessionId, [{ text: 'Count ' + count }]])));
}`;

async function start(): Promise<PluginTest> {
  const fixture = await dataFixture(source, {
    operations: [bump],
    slots: [rowSlotId],
    declared: {
      [workbenchSlotId]: [
        { id: 'count', title: 'Count', icon: { sf: 'number' }, page: '/card' },
      ],
    },
  });

  return fixture.start();
}

const rowOf = (text: string): SlotItems => ({
  first: { items: [{ pluginId: dataPluginId, item: { text } }], overflow: [] },
});

const rows = (
  kit: PluginTest,
  signal: AbortSignal,
): AsyncGenerator<SlotItems> =>
  kit.slotItems(
    { slotId: rowSlotId, contexts: [{ sessionId: 'first', projectId: 'one' }] },
    { signal },
  );

it('draws a Workbench card page with its Session context and the asking App’s surface', async () => {
  const kit = await start();

  expect(
    await kit.pages.draw({
      path: '/card',
      projectId: 'one',
      sessionId: 'first',
    }),
  ).toMatchObject({
    kind: 'tree',
    root: { type: 'Text', props: { children: 'one/first on web' } },
  });
});

it("draws a page again and asks an items Slot again after the Plugin's argo.changed()", async () => {
  const kit = await start();
  const controller = new AbortController();
  const items = rows(kit, controller.signal);
  const stale = kit.pages.stale(controller.signal);

  expect((await items.next()).value).toEqual(rowOf('Count 0'));
  expect(await kit.pages.draw({ path: '/' })).toMatchObject({
    root: { props: { children: 'Count 0' } },
  });

  await kit.pages.draw({ path: '/bump' });

  expect((await stale.next()).value).toEqual({ pluginId: dataPluginId });
  expect(await kit.pages.draw({ path: '/' })).toMatchObject({
    root: { props: { children: 'Count 1' } },
  });
  expect((await items.next()).value).toEqual(rowOf('Count 1'));
  controller.abort();
});

it('asks an items Slot again after one of the Plugin’s Operations ran', async () => {
  const kit = await start();
  const controller = new AbortController();
  const items = rows(kit, controller.signal);

  expect((await items.next()).value).toEqual(rowOf('Count 0'));
  await kit.operations.run({ name: 'bump' });
  expect((await items.next()).value).toEqual(rowOf('Count 1'));
  controller.abort();
});

const renderSource = (
  hook: string,
): string => `import { Screen, Text } from '@argo/plugin-kit';
export async function register(argo) { await argo.on('ui.render', ${hook}); }`;

async function rendering(hook: string): Promise<PluginTest> {
  const fixture = await dataFixture(renderSource(hook), {
    hooks: ['ui.render'],
    renders: [toolCallSlotId],
  });

  return fixture.start();
}

it("answers a Replaceable Slot with the Plugin's pure tree", async () => {
  const kit = await rendering(
    "(ctx, event) => <Text>{'Ran ' + event.slotId}</Text>",
  );

  expect(await kit.render(toolCallSlotFixture)).toEqual({
    type: 'replacement',
    pluginId: dataPluginId,
    root: expect.objectContaining({
      type: 'Text',
      props: expect.objectContaining({
        children: 'Ran ' + toolCallSlotId,
      }),
    }),
  });
});

it.each([
  ['throws', "() => { throw new Error('broken'); }", 'ui.render Hook: broken'],
  [
    'is refused',
    "() => <Screen title='Whole page' />",
    'Screen cannot replace a core component',
  ],
])(
  'draws core when the Plugin’s tree %s, and logs why',
  async (_, hook, reason) => {
    const kit = await rendering(hook);

    expect(await kit.render(toolCallSlotFixture)).toEqual({
      type: 'core',
      input: toolCallSlotFixture,
    });
    expect(await kit.log()).toContain(
      `Plugin ${dataPluginId}: core fallback ${toolCallSlotId}: ${reason}`,
    );
  },
);
