import { expect, it } from 'vitest';
import { dataFixture, dataPluginId } from '../mocks/data-fixture';

type Operation = {
  name: string;
  label: string;
  description: string;
  tier: 'act';
  params: Record<string, never>;
};

const operation = (name: string): Operation => ({
  name,
  label: name,
  description: `Badge ${name}.`,
  tier: 'act' as const,
  params: {},
});

it('publishes only its own nav badges, clears zero and refuses another nav id', async () => {
  const fixture = await dataFixture(
    `export function register(argo) {
      argo.operations.register('set', () => argo.nav.badge('inbox', 7));
      argo.operations.register('clear', () => argo.nav.badge('inbox', 0));
      argo.operations.register('other', async () => {
        try { await argo.nav.badge('another-plugins-nav', 4); return 'accepted'; } catch { return 'refused'; }
      });
    }`,
    {
      nav: [{ id: 'inbox', title: 'Inbox', path: '/' }],
      operations: ['set', 'clear', 'other'].map(operation),
    },
  );

  const kit = await fixture.start();
  const controller = new AbortController();
  const badges = kit.badges(controller.signal);
  expect((await badges.next()).value).toEqual([]);
  await kit.pages.run({ operation: 'set', args: {} });
  expect((await badges.next()).value).toEqual([
    { pluginId: dataPluginId, id: 'inbox', count: 7 },
  ]);
  expect(await kit.pages.run({ operation: 'other', args: {} })).toEqual({
    result: 'refused',
  });
  await kit.pages.run({ operation: 'clear', args: {} });
  expect((await badges.next()).value).toEqual([]);
  expect(await kit.log()).toContain(
    'refused argo.nav.badge another-plugins-nav',
  );
  controller.abort();
  await badges.return([]);
});
