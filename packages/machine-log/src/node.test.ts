import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromTransition } from 'xstate';
import { createNodeMachineLog } from './node';

const homes: string[] = [];
afterEach(() => {
  for (const home of homes.splice(0))
    rmSync(home, { recursive: true, force: true });
});

function temporaryHome() {
  const home = mkdtempSync(join(tmpdir(), 'machine-log-'));
  homes.push(home);
  return home;
}

it('appends complete JSON lines under the Server home when enabled', () => {
  vi.stubEnv('ARGO_MACHINE_LOG', '1');
  vi.stubEnv('NODE_ENV', 'development');
  const home = temporaryHome();
  for (let index = 0; index < 2; index += 1) {
    const actor = createActor(
      fromTransition((count: number) => count + 1, 0),
      {
        id: 'engine',
        inspect: createNodeMachineLog({ home, processName: 'engine' }),
      },
    ).start();
    actor.send({ type: 'increment' });
    actor.stop();
  }

  const text = readFileSync(
    join(home, 'logs', 'engine.machines.jsonl'),
    'utf8',
  );
  expect(text.endsWith('\n')).toBe(true);
  const records = text
    .trimEnd()
    .split('\n')
    .map((line) => JSON.parse(line));
  expect(new Set(records.map((record) => record.rootId)).size).toBe(2);
  expect(records).toContainEqual(
    expect.objectContaining({
      processName: 'engine',
      processId: process.pid,
      actorId: 'engine',
      type: '@xstate.snapshot',
      eventType: 'increment',
      context: 1,
    }),
  );
});

it.each([
  { switchValue: undefined, environment: 'development', development: true },
  { switchValue: '0', environment: 'development', development: true },
  { switchValue: 'true', environment: 'development', development: true },
  { switchValue: '1', environment: 'production', development: true },
  { switchValue: '1', environment: 'development', development: false },
])(
  'creates no log directory when disabled: %j',
  ({ switchValue, environment, development }) => {
    vi.stubEnv('ARGO_MACHINE_LOG', switchValue);
    vi.stubEnv('NODE_ENV', environment);
    const home = temporaryHome();
    const inspect = createNodeMachineLog({
      home,
      processName: 'supervisor',
      development,
    });
    const actor = createActor(
      fromTransition((context) => context, {}),
      { inspect },
    ).start();
    actor.stop();
    expect(inspect).toBeUndefined();
    expect(existsSync(join(home, 'logs'))).toBe(false);
  },
);
