import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { dataFixture, dataPage } from '../mocks/data-fixture';

it('retries a refused background Query after opening a page that declares no Queries', async () => {
  const source = dataPage(
    "{api:'process',action:'run',argv:['undeclared-command']}",
  ).replace(
    "argo.pages.register('/', Data);",
    "argo.pages.register('/', Data); argo.pages.register('/settings', () => <Text>Settings</Text>);",
  );

  const fixture = await dataFixture(source, {
    background: { path: '/', interval: 300000 },
  });

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect.poll(() => counts(kit)).toEqual({ passes: 1, refusals: 1 });
  await kit.clock.advance(300000);
  await expect.poll(() => counts(kit)).toEqual({ passes: 2, refusals: 1 });
  const page = kit.page('/settings', undefined, 'one');
  await page.find('Settings');
  expect(await counts(kit)).toEqual({ passes: 2, refusals: 1 });
  await kit.clock.advance(300000);
  await expect.poll(() => counts(kit)).toEqual({ passes: 3, refusals: 2 });
  await kit.clock.advance(300000);
  await expect.poll(() => counts(kit)).toEqual({ passes: 4, refusals: 2 });
});

type PassCounts = { passes: number; refusals: number };

async function counts(kit: PluginTest): Promise<PassCounts> {
  const lines = (await kit.log()).split('\n');

  return {
    passes: lines.filter((line) => line.includes('background pass completed'))
      .length,
    refusals: lines.filter((line) => line.includes('refused argo.process'))
      .length,
  };
}
