import { homedir } from 'node:os';
import { join } from 'node:path';
import { createActor } from 'xstate';
import { z } from 'zod';
import packageJson from '../../package.json' with { type: 'json' };
import { workerMachine } from './machine';

const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65535)
  .parse(process.env.ARGO_SERVER_PORT ?? 7337);

const worker = createActor(workerMachine, {
  input: {
    home: process.env.ARGO_HOME ?? join(homedir(), '.argo'),
    port,
    version: packageJson.version,
    startedAt: new Date().toISOString(),
  },
});
worker.subscribe({
  complete: () => process.exit(worker.getSnapshot().output?.exitCode ?? 1),
  error: (error) => {
    console.error(`worker: ${String(error)}`);
    process.exit(1);
  },
});
worker.start();
