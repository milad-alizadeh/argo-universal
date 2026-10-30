import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished, vi } from 'vitest';
import { z } from 'zod';
import { describeExit, isAlive, pollUntil, startChild } from './index';

const parentEntry = fileURLToPath(
  new URL('../mocks/parent-fixture.ts', import.meta.url),
);

const childEntry = fileURLToPath(
  new URL('../mocks/child-fixture.mjs', import.meta.url),
);

const Started = z.object({
  child: z.number(),
  message: z.object({ descendant: z.number() }),
});

vi.setConfig({ testTimeout: 20_000 });

// Negative ids are groups; one already gone needs nothing.
const kill = (id: number): void => {
  try {
    process.kill(id, 'SIGKILL');
  } catch {}
};

// The parent leads a group of its own, standing in for the Playwright runner and its workers.
async function startParent(): Promise<{ parent: number; child: number }> {
  const parent = spawn(
    process.execPath,
    ['--import', import.meta.resolve('tsx'), parentEntry],
    { detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] },
  );

  const pid = z.number().parse(parent.pid);

  onTestFinished((): void => kill(-pid));

  const started = await new Promise<unknown>((resolve): void => {
    parent.once('message', resolve);
  });

  const { child } = Started.parse(started);

  onTestFinished((): void => kill(-child));

  return { parent: pid, child };
}

it('a child kept in its caller group dies when that group is killed', async () => {
  const { parent, child } = await startParent();

  kill(-parent);

  await expect(
    pollUntil(
      (): true | undefined => (isAlive(child) ? undefined : true),
      'The child outlived its parent group',
      5000,
    ),
  ).resolves.toBe(true);
});

it('stopping a child kept in its caller group kills only the child, which leaves what it launched unproven', async () => {
  const child = startChild(
    {
      label: 'Fixture',
      entry: childEntry,
      args: ['serve'],
      env: { FIXTURE_IGNORE_TERM: '1' },
    },
    { messages: true, group: 'caller' },
  );

  const descendant = await new Promise<number>((resolve): void => {
    child.onMessage((message): void =>
      resolve(Started.shape.message.parse(message).descendant),
    );
  });

  onTestFinished((): void => kill(descendant));
  await expect(child.stop(100)).resolves.toBe('unresolved');
  expect(describeExit(await child.exited)).toBe('signal SIGKILL');
});
