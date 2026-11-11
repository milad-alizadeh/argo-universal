import type { PluginTest } from '@argo/plugin-kit/testing';
import { drawsNothing } from '@repo/contracts/plugins/wire-empty-page';
import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const workbenchSlotId = 'argo/session/workbench/v1';

/*
 * A Workbench card's page says it has nothing to show by returning `null` (ADR-0035, ADR-0050): the Server answers
 * the empty root, so an App draws no card, and a page that drew anything, even an empty Stack, still has one.
 */
const source = `import { Stack, Text } from '@argo/plugin-kit';
export function register(argo) {
  argo.pages.define('/nothing', { load: () => null, render: () => null });
  argo.pages.define('/empty-stack', { load: () => null, render: () => <Stack direction="column" /> });
  argo.pages.define('/text', { load: () => null, render: () => <Text>One line</Text> });
  argo.pages.define('/by-session', {
    load: ({ context: { sessionId } }) => sessionId,
    render: (sessionId) => (sessionId === 'attached' ? <Text>Attached</Text> : null),
  });
}`;

async function start(): Promise<PluginTest> {
  const fixture = await dataFixture(source, {
    declared: {
      [workbenchSlotId]: [
        { id: 'one', title: 'One', icon: { sf: 'number' }, page: '/nothing' },
      ],
    },
  });

  return fixture.start();
}

async function drawsSomething(
  path: string,
  sessionId?: string,
): Promise<boolean> {
  const kit = await start();
  const answer = await kit.pages.draw({ path, projectId: 'one', sessionId });

  if (answer.kind !== 'tree') throw new Error(`${path} drew no tree`);

  return !drawsNothing(answer.root);
}

it('answers the empty root for a page that returns null', async () => {
  expect(await drawsSomething('/nothing')).toBe(false);
});

it('answers a tree for a page that drew an empty Stack or one Text', async () => {
  expect(await drawsSomething('/empty-stack')).toBe(true);
  expect(await drawsSomething('/text')).toBe(true);
});

it('answers by the Session the page is drawn for', async () => {
  expect(await drawsSomething('/by-session', 'attached')).toBe(true);
  expect(await drawsSomething('/by-session', 'other')).toBe(false);
});
