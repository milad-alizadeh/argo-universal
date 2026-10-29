import type { Serializable } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished, vi } from 'vitest';
import { z } from 'zod';
import {
  type ChildHandle,
  describeExit,
  isAlive,
  pollUntil,
  signalStop,
  startChild,
  startService,
} from './index';

const entry = fileURLToPath(
  new URL('../mocks/child-fixture.mjs', import.meta.url),
);

const Descendant = z.object({ descendant: z.number() });

const label = 'Fixture';

vi.setConfig({ testTimeout: 20_000 });

function firstMessage(child: ChildHandle): Promise<Serializable> {
  return new Promise((resolve): void => {
    const stop = child.onMessage((message): void => {
      stop();
      resolve(message);
    });
  });
}

async function serve(
  env: NodeJS.ProcessEnv = {},
): Promise<{ child: ChildHandle; descendant: number }> {
  const child = startChild(
    { label, entry, args: ['serve'], env },
    { messages: true },
  );

  onTestFinished(async (): Promise<void> => {
    await child.stop(100);
  });
  const { descendant } = Descendant.parse(await firstMessage(child));

  return { child, descendant };
}

it('a stopped child is released with the descendant it launched', async () => {
  const { child, descendant } = await serve();

  await expect(child.stop()).resolves.toBe('released');
  expect(describeExit(await child.exited)).toBe('signal SIGTERM');
  expect(isAlive(descendant)).toBe(false);
});

it('a child that ignores SIGTERM is killed with its group after the grace', async () => {
  const { child, descendant } = await serve({ FIXTURE_IGNORE_TERM: '1' });

  await expect(child.stop(100)).resolves.toBe('released');
  expect(describeExit(await child.exited)).toBe('signal SIGKILL');
  expect(isAlive(descendant)).toBe(false);
});

it('stopping a child that has already exited only releases its group', async () => {
  const child = startChild(
    { label, entry, args: ['fail'] },
    { output: 'tail' },
  );

  expect(describeExit(await child.exited)).toBe('code 3');
  await expect(child.stop()).resolves.toBe('released');
});

it('asking a process that has exited to stop does nothing', async () => {
  const child = startChild(
    { label, entry, args: ['fail'] },
    { output: 'tail' },
  );

  await child.exited;
  const pid = z.number().parse(child.pid);

  expect((): void => signalStop(pid)).not.toThrow();
  expect(isAlive(pid)).toBe(false);
});

it('waiting for a child that exits fails with its exit and the end of its stderr', async () => {
  const child = startChild(
    { label, entry, args: ['fail'] },
    { output: 'tail' },
  );

  await expect(child.waitUntil((): undefined => undefined)).rejects.toThrow(
    /^The Fixture exited \(code 3\)\nstderr \(last 2000 characters\):\nlisten EADDRINUSE/,
  );
  expect(child.stderrTail()).toContain('EADDRINUSE');
});

it('waiting returns the first answer the check gives while the child runs', async () => {
  const { child } = await serve();
  let checks = 0;

  const answer = await child.waitUntil((): string | undefined => {
    checks += 1;

    return checks === 2 ? 'ready' : undefined;
  });

  expect(answer).toBe('ready');
});

it('polling past its limit fails with the limit in seconds', async () => {
  await expect(
    pollUntil((): undefined => undefined, 'Nothing answered', 300),
  ).rejects.toThrow('Nothing answered within 0.3 s');
});

it('a service runs without ELECTRON_RUN_AS_NODE and with the environment it is given', async () => {
  vi.stubEnv('ELECTRON_RUN_AS_NODE', '1');

  const service = startService({
    label,
    entry,
    args: ['environment'],
    env: { FIXTURE_VALUE: 'given' },
  });

  await expect(firstMessage(service)).resolves.toEqual({
    electron: null,
    value: 'given',
  });
  expect(describeExit(await service.exited)).toBe('code 0');
});
