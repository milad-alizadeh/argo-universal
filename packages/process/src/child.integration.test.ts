import type { Serializable } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished, vi } from 'vitest';
import { z } from 'zod';
import {
  type ChildCommand,
  type ChildHandle,
  describeExit,
  isAlive,
  pollUntil,
  startChild,
  startService,
  stopLimitMs,
  stopProcess,
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

const graceMs = 100;

async function serve(
  env: NodeJS.ProcessEnv = {},
  start: (command: ChildCommand) => ChildHandle = (command) =>
    startChild(command, { messages: true }),
): Promise<{ child: ChildHandle; descendant: number }> {
  const child = start({ label, entry, args: ['serve'], env });

  onTestFinished(async (): Promise<void> => {
    await child.stop(graceMs);
  });
  const { descendant } = Descendant.parse(await firstMessage(child));

  return { child, descendant };
}

it('a stopped child is released with the descendant it launched', async () => {
  const { child, descendant } = await serve();

  await expect(child.stop(stopLimitMs)).resolves.toBe('released');
  expect(describeExit(await child.exited)).toBe('signal SIGTERM');
  expect(isAlive(descendant)).toBe(false);
});

it('a child that ignores SIGTERM is killed with its group after the grace', async () => {
  const { child, descendant } = await serve({ FIXTURE_IGNORE_TERM: '1' });

  await expect(child.stop(graceMs)).resolves.toBe('released');
  expect(describeExit(await child.exited)).toBe('signal SIGKILL');
  expect(isAlive(descendant)).toBe(false);
});

it('stopping a child that has already exited only releases its group', async () => {
  const child = startChild(
    { label, entry, args: ['fail'] },
    { output: 'tail' },
  );

  expect(describeExit(await child.exited)).toBe('code 3');
  await expect(child.stop(graceMs)).resolves.toBe('released');
});

it('a process stopped by its pid is released with the descendant in its group', async () => {
  const { child, descendant } = await serve({}, startService);
  const pid = z.number().parse(child.pid);

  await expect(stopProcess(pid, stopLimitMs)).resolves.toBe('released');
  expect(isAlive(pid)).toBe(false);
  expect(isAlive(descendant)).toBe(false);
});

it('a process stopped by its pid that ignores SIGTERM is killed with its group after the grace', async () => {
  const { child, descendant } = await serve(
    { FIXTURE_IGNORE_TERM: '1' },
    startService,
  );

  const pid = z.number().parse(child.pid);

  await expect(stopProcess(pid, graceMs)).resolves.toBe('released');
  expect(describeExit(await child.exited)).toBe('signal SIGKILL');
  expect(isAlive(descendant)).toBe(false);
});

it('waiting for a child that exits fails with its exit and the end of its output, stdout included', async () => {
  const child = startChild(
    { label, entry, args: ['fail'] },
    { output: 'tail' },
  );

  await expect(child.waitUntil((): undefined => undefined)).rejects.toThrow(
    /^The Fixture exited \(code 3\)\noutput \(last 2000 characters\):\n[\s\S]*listen EADDRINUSE/,
  );
  expect(child.outputTail()).toContain('listen EADDRINUSE');
  expect(child.outputTail()).toContain('Engine stopped');
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
