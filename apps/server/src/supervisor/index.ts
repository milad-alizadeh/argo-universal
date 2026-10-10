import { resolveRuntimeDirectory } from '@repo/engine/server-runtime';
import { writeLog } from '@repo/machine-log';
import { createActor } from 'xstate';
import packageJson from '../../package.json' with { type: 'json' };
import { supervisorMachine } from './machine';

export function startSupervisor(options: { watch: boolean }): void {
  const home = resolveRuntimeDirectory();
  const log = (line: string): void =>
    writeLog({ home, label: 'supervisor', line });

  const supervisor = createActor(supervisorMachine, {
    input: {
      home,
      now: Date.now,
      version: packageJson.version,
      startedAt: new Date().toISOString(),
      watch: options.watch,
    },
  });

  let lastState: string | undefined;
  supervisor.subscribe({
    next: (snapshot): void => {
      const state =
        typeof snapshot.value === 'string'
          ? snapshot.value
          : JSON.stringify(snapshot.value);
      if (state === lastState) return;
      lastState = state;
      log(state);
    },
    // The Engine process keeps the event loop alive until it exits, then Node exits with this code.
    complete: (): void => {
      process.exitCode = supervisor.getSnapshot().matches('failed') ? 1 : 0;
    },
    error: (error): void => {
      log(`error: ${String(error)}`);
      process.exitCode = 1;
    },
  });

  const stop = (signal: NodeJS.Signals): void => {
    if (supervisor.getSnapshot().status !== 'active') process.exit();
    log(`received ${signal}`);
    supervisor.send({ type: 'server.stop' });
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  supervisor.start();
}
