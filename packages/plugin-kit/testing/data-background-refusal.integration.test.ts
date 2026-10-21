import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { dataFixture, dataPage, processWait } from '../mocks/data-fixture';

const ungranted = "{api:'process',action:'run',argv:['undeclared-command']}";

const contributes = { background: { path: '/', interval: 300000 } };

const completedLine = 'background pass completed';

function refusals(log: string): number {
  return log.split('\n').filter((line) => line.includes('refused argo.process'))
    .length;
}

async function passes(kit: PluginTest): Promise<number> {
  return (await kit.log())
    .split('\n')
    .filter((line) => line.includes(completedLine)).length;
}

it('answers a page its own refresh after a background pass was refused', async () => {
  const fixture = await dataFixture(dataPage(ungranted), contributes);
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect.poll(() => passes(kit), processWait).toBe(1);

  const page = kit.page('/', undefined, 'one');
  await page.find('Refresh');
  await kit.clock.advance(300000);
  await expect.poll(() => passes(kit), processWait).toBe(2);
  await kit.clock.advance(0);
  await page.press('Refresh');

  await expect.poll(async () => refusals(await kit.log()), processWait).toBe(3);
});

it('leaves a page on its own clock after a background pass was refused', async () => {
  const fixture = await dataFixture(
    dataPage(ungranted, '{ every: 290000 }'),
    contributes,
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect.poll(() => passes(kit), processWait).toBe(1);

  const page = kit.page('/', undefined, 'one');
  await page.find('Refresh');
  await kit.clock.advance(300000);
  await expect.poll(() => passes(kit), processWait).toBe(2);

  const refused = refusals(await kit.log());
  await kit.clock.advance(290000);

  await expect
    .poll(async () => refusals(await kit.log()), processWait)
    .toBeGreaterThan(refused);
});
