import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, processWait } from '../mocks/data-fixture';
import {
  background,
  backgroundPage,
  completed,
  completedLine,
} from './loader-background-fixture';

it.each([299999, 300000, 300001])(
  'runs the Loader on the background interval, clamped from %i',
  async (interval) => {
    const fixture = await dataFixture(backgroundPage(), background(interval));

    const kit = await fixture.start({
      projectPaths: { one: fixture.directory },
    });

    await expect.poll(() => completed(kit), processWait).toBe(1);
    const period = Math.max(interval, 300000);
    await kit.clock.advance(period - 1);
    expect(await fixture.requests()).toHaveLength(1);
    await kit.clock.advance(1);
    await expect.poll(() => completed(kit), processWait).toBe(2);
    expect(
      (await kit.log())
        .split('\n')
        .filter(
          (line) =>
            line.includes('background interval') && line.includes('clamped'),
        ),
    ).toHaveLength(interval < 300000 ? 1 : 0);
  },
);

it('ends a pass at its sixty-second budget with the Loader still waiting', async () => {
  const fixture = await dataFixture(
    backgroundPage(", 'hang'", ', { timeoutMs: 120000 }'),
    background(),
  );

  await appendFile(
    join(fixture.directory, 'query-fixture'),
    "\nif (process.argv.includes('hang')) setInterval(() => {}, 1000);\n",
  );
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });
  await expect.poll(() => fixture.requests(), processWait).toHaveLength(1);
  await kit.clock.advance(59999);
  expect(await kit.log()).not.toContain('background pass reached');
  await kit.clock.advance(1);
  await expect
    .poll(() => kit.log(), processWait)
    .toContain('background pass reached 60000 ms');
  expect(await kit.log()).not.toContain(completedLine);
});

it('activates a crashed Plugin again on the next background interval', async () => {
  const fixture = await dataFixture(
    "export function register() { throw new Error('cannot start'); }",
    background(),
  );

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect
    .poll(() => kit.log(), processWait)
    .toContain('background pass failed');
  await writeFile(join(fixture.directory, 'index.tsx'), backgroundPage());
  await kit.clock.advance(300000);
  await expect.poll(() => completed(kit), processWait).toBe(1);
  expect(await fixture.requests()).toHaveLength(1);
});

it('refuses a background path that is not a Loader page', async () => {
  const fixture = await dataFixture(backgroundPage(), {
    ...background(),
    background: { path: '/missing', interval: 300000 },
  });

  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect
    .poll(() => kit.log(), processWait)
    .toContain('Background path /missing is not a Loader page');
  expect(await fixture.requests()).toEqual([]);
});
