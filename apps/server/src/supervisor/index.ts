import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createActor } from 'xstate';
import packageJson from '../../package.json' with { type: 'json' };
import { supervisorMachine } from './machine';

export function startSupervisor(options: { watch: boolean }) {
  const home = process.env.ARGO_HOME ?? join(homedir(), '.argo');
  const logFile = join(home, 'logs', 'supervisor.log');
  mkdirSync(join(home, 'logs'), { recursive: true });
  const log = (line: string) => {
    const stamped = `${new Date().toISOString()} supervisor ${process.pid}: ${line}`;
    console.log(stamped);
    appendFileSync(logFile, `${stamped}\n`);
  };

  const supervisor = createActor(supervisorMachine, {
    input: {
      home,
      version: packageJson.version,
      startedAt: new Date().toISOString(),
      watch: options.watch,
    },
  });

  let lastState: unknown;
  supervisor.subscribe({
    next: (snapshot) => {
      if (snapshot.value === lastState) return;
      lastState = snapshot.value;
      log(`${String(snapshot.value)}`);
    },
    // The worker process keeps the event loop alive until it exits, then Node exits with this code.
    complete: () => {
      process.exitCode = supervisor.getSnapshot().matches('failed') ? 1 : 0;
    },
    error: (error) => {
      log(`error: ${String(error)}`);
      process.exitCode = 1;
    },
  });

  const stop = (signal: NodeJS.Signals) => {
    if (supervisor.getSnapshot().status !== 'active') process.exit();
    log(`received ${signal}`);
    supervisor.send({ type: 'server.stop' });
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  supervisor.start();
}
