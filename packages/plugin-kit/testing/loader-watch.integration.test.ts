import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Contributions } from '@repo/engine/mocks/data-fixture';
import { expect, it } from 'vitest';
import { dataFixture, dataPluginId, processWait } from '../mocks/data-fixture';

const note = {
  name: 'note',
  label: 'Note',
  description: 'Writes a note.',
  tier: 'act' as const,
  params: {
    text: { type: 'string' as const, description: 'The note', required: true },
  },
};

const watching = (interval = 60000): Contributions => ({
  nav: [],
  watch: { path: '/', interval },
  operations: [note],
});

// A Watch acts through its own Operation; the Loader beside it records whether it was given a way to act.
const watchPlugin = (extra = ''): string => `
import { Text } from '@argo/plugin-kit';
export function register(argo) {
  argo.operations.register('note', async ({ text }, { projectId }) => {
    await argo.process.run(['query-fixture', projectId ?? 'none', text]);
    return null;
  });
  argo.pages.define('/loader', {
    load: async (input) => {
      await argo.process.run(['query-fixture', 'loader', typeof input.run]);
    },
    render: () => <Text>loader</Text>,
  });
  argo.watch.define('/', async ({ context: { projectId }, run }) => {
    ${extra}
    await run('note', { text: 'watched' });
    return projectId;
  });
}`;

const ran = async (
  fixture: Awaited<ReturnType<typeof dataFixture>>,
): Promise<string[][]> =>
  (await fixture.requests()).map((line) => JSON.parse(line).args as string[]);

const watches = async (
  kit: { log: () => Promise<string> },
  line = 'watch completed',
): Promise<number> =>
  (await kit.log()).split('\n').filter((entry) => entry.includes(line)).length;

it('runs a Watch once per Project each interval with no App connected, and lets it call its own Operation', async () => {
  const fixture = await dataFixture(watchPlugin(), watching());
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect.poll(() => watches(kit), processWait).toBe(1);
  await kit.clock.advance(59999);
  expect(await watches(kit)).toBe(1);
  await kit.clock.advance(1);
  await expect.poll(() => watches(kit), processWait).toBe(2);
  expect(await ran(fixture)).toEqual([
    ['one', 'watched'],
    ['one', 'watched'],
  ]);
});

it('clamps a Watch interval and logs it', async () => {
  const fixture = await dataFixture(watchPlugin(), watching(1000));
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect.poll(() => watches(kit), processWait).toBe(1);
  await kit.clock.advance(59999);
  expect(await watches(kit)).toBe(1);
  await kit.clock.advance(1);
  await expect.poll(() => watches(kit), processWait).toBe(2);
  expect(await watches(kit, 'watch interval 1000 ms clamped')).toBe(1);
});

it('stops a Watch that overruns its budget, logs it, and still runs the next', async () => {
  const fixture = await dataFixture(
    watchPlugin(
      'if (!globalThis.ranOnce) { globalThis.ranOnce = true; await new Promise(() => {}); }',
    ),
    watching(),
  );
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect
    .poll(() => kit.log(), processWait)
    .not.toContain('watch completed');
  await kit.clock.advance(60000);
  await expect
    .poll(() => watches(kit, 'watch reached 60000 ms'), processWait)
    .toBe(1);
  await kit.clock.advance(60000);
  await expect.poll(() => watches(kit), processWait).toBe(1);
});

it('stops a Watch when its Plugin is turned off and resumes it when turned on', async () => {
  const fixture = await dataFixture(watchPlugin(), watching());
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect.poll(() => watches(kit), processWait).toBe(1);
  await kit.plugins.setEnabled(dataPluginId, false);
  await kit.clock.advance(120000);
  expect(await watches(kit)).toBe(1);
  await kit.plugins.setEnabled(dataPluginId, true);
  await expect.poll(() => watches(kit), processWait).toBe(2);
});

it('runs a crashed Plugin Watch again once the Plugin starts', async () => {
  const fixture = await dataFixture(
    "export function register() { throw new Error('cannot start'); }",
    watching(),
  );
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect.poll(() => kit.log(), processWait).toContain('watch failed');
  await writeFile(join(fixture.directory, 'index.tsx'), watchPlugin());
  await kit.clock.advance(60000);
  await expect.poll(() => watches(kit), processWait).toBe(1);
});

it('gives a Loader no way to act', async () => {
  const fixture = await dataFixture(watchPlugin(), watching());
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect.poll(() => watches(kit), processWait).toBe(1);
  await kit.pages.draw({ path: '/loader' });
  expect(await ran(fixture)).toContainEqual(['loader', 'undefined']);
});

it('refuses a Watch path no Watch defined', async () => {
  const fixture = await dataFixture(watchPlugin(), {
    ...watching(),
    watch: { path: '/missing', interval: 60000 },
  });
  const kit = await fixture.start({ projectPaths: { one: fixture.directory } });

  await expect
    .poll(() => kit.log(), processWait)
    .toContain('Watch path /missing is not defined by argo.watch.define');
  expect(await fixture.requests()).toEqual([]);
});
