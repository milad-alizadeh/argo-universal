import { expect, it } from 'vitest';
import { dataFixture, dataPluginId } from '../mocks/data-fixture';

it('publishes only its own nav counts, clears zero and refuses another nav id', async () => {
  const fixture = await dataFixture(
    `import { Text, Stack, Button, useState } from '@argo/plugin-kit';
    export function register(argo) {
      function Nav() {
        const [result, setResult] = useState('ready');
        return <Stack direction="column"><Text>{result}</Text><Button label="Set" onPress={() => argo.nav.badge('inbox', 7)} /><Button label="Clear" onPress={() => argo.nav.badge('inbox', 0)} /><Button label="Other" onPress={async () => { try { await argo.nav.badge('another-plugins-nav', 4); setResult('accepted'); } catch { setResult('refused'); } }} /></Stack>;
      }
      argo.pages.register('/', Nav);
    }`,
    { nav: [{ id: 'inbox', title: 'Inbox', path: '/' }] },
  );

  const kit = await fixture.start();
  const controller = new AbortController();
  const badges = kit.badges(controller.signal);
  expect((await badges.next()).value).toEqual([]);
  const page = kit.page();
  await page.find('ready');
  await page.press('Set');
  expect((await badges.next()).value).toEqual([
    { pluginId: dataPluginId, id: 'inbox', count: 7 },
  ]);
  await page.press('Other');
  await page.find('refused');
  await page.press('Clear');
  expect((await badges.next()).value).toEqual([]);
  expect(await kit.log()).toContain(
    'refused argo.nav.badge another-plugins-nav',
  );
  controller.abort();
  await badges.return([]);
});
