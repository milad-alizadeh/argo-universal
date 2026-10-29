import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAlive } from '@repo/process';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { type AnyActorRef, createActor, setup } from 'xstate';
import { z } from 'zod';
import { engineProcess, type EngineProcessInput } from './engine-process';

const entry = fileURLToPath(
  new URL('../../mocks/engine-fixture.ts', import.meta.url),
);

let folder: string;

let events: { type: string }[];

let killTimeoutMs: number | undefined;

type StoppableActor = { stop: () => void };

let supervisor: StoppableActor = { stop: (): void => {} };

const stopEvent = { type: 'engine.stop' };

const exitedType = 'engine.exited';

// Forking a TypeScript Engine and waiting out a kill timeout takes longer than the default.
const patience = { timeout: 10_000 };

vi.setConfig({ testTimeout: 20_000 });

// A parent that records what the Engine actor reports, as the Supervisor machine receives it.
const parent = setup({ actors: { engine: engineProcess } }).createMachine({
  invoke: {
    id: 'engine',
    src: 'engine',
    input: (): EngineProcessInput => ({ watch: false, entry, killTimeoutMs }),
  },
  on: { '*': { actions: ({ event }): void => void events.push(event) } },
});

async function startEngine(): Promise<{
  engine: AnyActorRef;
  leader: number;
  descendant: number;
}> {
  const actor = createActor(parent).start();
  supervisor = actor;
  await vi.waitFor(
    () => expect(events).toContainEqual({ type: 'engine.ready', port: 7337 }),
    patience,
  );
  const engine = actor.getSnapshot().children['engine'];

  if (!engine) throw new Error('The Engine actor did not start');

  const pids = z
    .object({ engine: z.number(), descendant: z.number() })
    .parse(JSON.parse(readFileSync(join(folder, 'pids.json'), 'utf8')));

  return { engine, leader: pids.engine, descendant: pids.descendant };
}

const outcomes = (): string[] =>
  events
    .map((event): string => event.type)
    .filter((type): boolean => type !== 'engine.heartbeat');

beforeEach((): void => {
  folder = mkdtempSync(join(tmpdir(), 'argo-engine-process-'));
  events = [];
  killTimeoutMs = undefined;
  vi.stubEnv('ARGO_FIXTURE_PIDFILE', join(folder, 'pids.json'));
  vi.stubEnv('ARGO_HOME', folder);
});

afterEach((): void => {
  supervisor.stop();
  vi.unstubAllEnvs();
  rmSync(folder, { recursive: true, force: true });
});

it('a stopped Engine reports exited only after its descendant is gone', async () => {
  const { engine, descendant } = await startEngine();
  engine.send(stopEvent);
  await vi.waitFor(() => expect(outcomes()).toContain(exitedType), patience);
  expect(isAlive(descendant)).toBe(false);
});

it('an Engine that ignores SIGTERM is killed with its group after the timeout', async () => {
  vi.stubEnv('ARGO_FIXTURE_IGNORE_TERM', '1');
  killTimeoutMs = 300;
  const { engine, descendant } = await startEngine();
  engine.send(stopEvent);
  await vi.waitFor(
    () => expect(events).toContainEqual({ type: exitedType }),
    patience,
  );
  expect(isAlive(descendant)).toBe(false);
});

it('an abruptly killed Engine leaves no descendant before exited is reported', async () => {
  const { engine, leader, descendant } = await startEngine();
  // As an OOM kill would: no cleanup runs and the descendant is orphaned.
  process.kill(leader, 'SIGKILL');
  await vi.waitFor(() => expect(outcomes()).toContain('engine.exit'), patience);
  expect(isAlive(descendant)).toBe(true);
  engine.send(stopEvent);
  await vi.waitFor(() => expect(outcomes()).toContain(exitedType), patience);
  expect(isAlive(descendant)).toBe(false);
});

it('stopping the Supervisor takes the Engine and its descendant down', async () => {
  const { descendant } = await startEngine();
  supervisor.stop();
  await vi.waitFor(() => expect(isAlive(descendant)).toBe(false), patience);
});
