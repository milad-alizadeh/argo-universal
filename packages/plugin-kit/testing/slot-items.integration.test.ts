import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const slotId = 'argo/session/row/v1';

const contexts = [
  { sessionId: 'first', projectId: 'one' },
  { sessionId: 'second', projectId: 'one' },
];

const sessions = {
  first: { projectId: 'one', branch: 'issue-412', title: 'First Session' },
  second: { projectId: 'one', branch: null, title: 'Second Session' },
};

it('answers a whole Session list in one call, reading each branch through argo.sessions.get', async () => {
  const fixture = await dataFixture(
    `let calls = 0;
    export function register(argo) {
      argo.slots.register('${slotId}', async ({ contexts }) => {
        calls += 1;
        const rows = await Promise.all(contexts.map(async ({ sessionId }) => {
          const session = await argo.sessions.get(sessionId);
          return [sessionId, session.branch ? [{ text: session.branch + ' #' + calls }] : []];
        }));
        return Object.fromEntries(rows);
      });
    }`,
    { slots: [slotId] },
    [{ kind: 'sessions:read' }],
  );

  const kit = await fixture.start({ sessions });
  const controller = new AbortController();

  const items = kit.slotItems(
    { slotId, contexts },
    { signal: controller.signal },
  );

  expect((await items.next()).value).toEqual({
    first: {
      items: [{ pluginId: 'data-fixture', item: { text: 'issue-412 #1' } }],
      overflow: [],
    },
  });
  controller.abort();
});

it('leaves a Plugin out when it reads a Session without the sessions:read Capability', async () => {
  const fixture = await dataFixture(
    `export function register(argo) {
      argo.slots.register('${slotId}', async ({ contexts }) => {
        await argo.sessions.get(contexts[0].sessionId);
        return {};
      });
    }`,
    { slots: [slotId] },
  );

  const kit = await fixture.start({ sessions });
  const controller = new AbortController();

  const items = kit.slotItems(
    { slotId, contexts },
    { signal: controller.signal },
  );

  expect((await items.next()).value).toEqual({});
  expect(await kit.log()).toContain('items provider threw');
  controller.abort();
});
