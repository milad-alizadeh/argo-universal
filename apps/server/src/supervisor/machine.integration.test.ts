import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  backoffBaseMs,
  crashWindowMs,
  maxCrashesInWindow,
  supervisorMachine,
} from './machine';
import {
  createMockEngine,
  engines,
  latestEngine,
  supervisor,
  supervisorStartedAt,
  readyEngineEvent,
  engineExitedEvent,
  stopServerEvent,
  heartbeatEngineEvent,
  startSupervisorActor,
} from './machine-fixture.mocks';

const crashLatestEngine = (): void =>
  latestEngine().send({ type: engineExitedEvent, code: 1 });

const keepRunningFor = (milliseconds: number): void => {
  latestEngine().send({ type: readyEngineEvent, port: 7337 });

  for (let waited = 0; waited < milliseconds; waited += 1000) {
    vi.advanceTimersByTime(1000);
    latestEngine().send({ type: heartbeatEngineEvent });
  }
};

// Crashes the Engine and returns how long the Supervisor waited before it started the next one.
const crashAndWaitForRestart = (): number => {
  const before = engines.length;
  crashLatestEngine();
  let waited = 0;

  while (engines.length === before) {
    if (waited >= 60_000) throw new Error('The engine was not restarted');
    vi.advanceTimersByTime(100);
    waited += 100;
  }

  return waited;
};

// What the real server.json actions do on disk, and the crash window, which traversal cannot reach.
describe('supervisor', (): void => {
  let home: string;

  const serverJsonPath = (): string => join(home, 'server.json');

  const readServerJson = (): ReturnType<typeof JSON.parse> =>
    JSON.parse(readFileSync(serverJsonPath(), 'utf8'));

  const otherServerAddress = {
    pid: process.pid + 1,
    port: 7337,
    version: '1.2.3',
    startedAt: '2026-10-02T00:00:00.000Z',
  };

  const writeOtherServerJson = (): void =>
    writeFileSync(serverJsonPath(), JSON.stringify(otherServerAddress));

  const startSupervisor = (): typeof supervisor => {
    startSupervisorActor(
      supervisorMachine.provide({
        actors: { engine: createMockEngine({ exitsWhenAsked: true }) },
      }),
      {
        now: (): number => Date.now(),
        home,
        version: '1.2.3',
        startedAt: supervisorStartedAt,
        watch: false,
      },
    );

    return supervisor;
  };

  beforeEach((): void => {
    home = mkdtempSync(join(tmpdir(), 'server-supervisor-'));
  });

  afterEach((): void => {
    rmSync(home, { recursive: true, force: true });
  });

  it('writes server.json atomically with its own pid and the engine port', (): void => {
    startSupervisor();
    expect(existsSync(serverJsonPath())).toBe(false);

    latestEngine().send({ type: readyEngineEvent, port: 7337 });

    expect(readServerJson()).toEqual({
      pid: process.pid,
      port: 7337,
      version: '1.2.3',
      startedAt: supervisorStartedAt,
    });
    expect(readdirSync(home)).toEqual(['server.json']);
  });

  it('removes its own server.json when asked to stop', (): void => {
    startSupervisor();
    latestEngine().send({ type: readyEngineEvent, port: 7337 });

    supervisor.send({ type: stopServerEvent });

    expect(existsSync(serverJsonPath())).toBe(false);
  });

  it('forgets crashes older than the crash window', (): void => {
    startSupervisor();

    for (let crash = 0; crash < maxCrashesInWindow - 1; crash++)
      crashAndWaitForRestart();
    keepRunningFor(crashWindowMs);

    expect(crashAndWaitForRestart()).toBe(backoffBaseMs);
    expect(supervisor.getSnapshot().value).toBe('starting');
  });

  it('still counts crashes from within the crash window', (): void => {
    startSupervisor();

    for (let crash = 0; crash < maxCrashesInWindow - 1; crash++)
      crashAndWaitForRestart();
    keepRunningFor(crashWindowMs / 2);
    crashLatestEngine();

    expect(supervisor.getSnapshot().value).toBe('failed');
  });

  it('leaves a server.json with another pid when it fails', (): void => {
    startSupervisor();
    writeOtherServerJson();

    for (let crash = 0; crash < maxCrashesInWindow - 1; crash++)
      crashAndWaitForRestart();
    crashLatestEngine();

    expect(supervisor.getSnapshot().value).toBe('failed');
    expect(readServerJson()).toEqual(otherServerAddress);
  });

  it('leaves a server.json with another pid when asked to stop', (): void => {
    startSupervisor();
    writeOtherServerJson();

    supervisor.send({ type: stopServerEvent });

    expect(supervisor.getSnapshot().value).toBe('stopping');
    expect(readServerJson()).toEqual(otherServerAddress);
  });
});
