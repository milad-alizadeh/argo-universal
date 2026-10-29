import { resolveRuntimeDirectory } from '@repo/engine/server-runtime';
import { writeLog } from '@repo/machine-log';
import { createActor, type ActorRefFrom, type SnapshotFrom } from 'xstate';
import packageJson from '../../package.json' with { type: 'json' };
import { supervisorMachine } from './machine';

export function startSupervisor(options: {
  watch: boolean;
  engineEntry?: string;
}): void {
  const home = resolveRuntimeDirectory();

  const log = (line: string): void =>
    writeLog({ home, label: 'supervisor', line });

  const supervisor = createSupervisor(home, options);

  observeSupervisor(supervisor, log);
  listenForStop(supervisor, log);
  supervisor.start();
}

const createSupervisor = (
  home: string,
  options: { watch: boolean; engineEntry?: string },
): ActorRefFrom<typeof supervisorMachine> =>
  createActor(supervisorMachine, {
    input: {
      home,
      now: Date.now,
      version: packageJson.version,
      startedAt: new Date().toISOString(),
      watch: options.watch,
      engineEntry: options.engineEntry,
    },
  });

const observeSupervisor = (
  supervisor: ActorRefFrom<typeof supervisorMachine>,
  log: (line: string) => void,
): void => {
  supervisor.subscribe({
    next: stateLogger(log),
    // The Engine process keeps the event loop alive until it exits, then Node exits with this code.
    complete: (): void => {
      process.exitCode = supervisor.getSnapshot().matches('stopping') ? 0 : 1;
    },
    error: (error): void => {
      log(`error: ${String(error)}`);
      process.exitCode = 1;
    },
  });
};

const stateLogger = (
  log: (line: string) => void,
): ((snapshot: SnapshotFrom<typeof supervisorMachine>) => void) => {
  let lastState: string | undefined;

  return (snapshot: SnapshotFrom<typeof supervisorMachine>): void => {
    const state =
      typeof snapshot.value === 'string'
        ? snapshot.value
        : JSON.stringify(snapshot.value);

    if (state === lastState) return;
    lastState = state;
    log(state);
  };
};

const listenForStop = (
  supervisor: ActorRefFrom<typeof supervisorMachine>,
  log: (line: string) => void,
): void => {
  const stop = (signal: NodeJS.Signals): void => {
    if (supervisor.getSnapshot().status !== 'active') process.exit();
    log(`received ${signal}`);
    supervisor.send({ type: 'server.stop' });
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
};
