import { homedir } from 'node:os';
import { join } from 'node:path';
import { createActor } from 'xstate';
import { z } from 'zod';
import packageJson from '../../package.json' with { type: 'json' };
import { engineMachine } from './machine';

const highestPort = 65_535;
const defaultPort = 7337;
const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(highestPort)
  .parse(process.env.ARGO_SERVER_PORT ?? defaultPort);

const home = process.env.ARGO_HOME ?? join(homedir(), '.argo');
const engine = createActor(engineMachine, {
  input: {
    home,
    port,
    version: packageJson.version,
    startedAt: new Date().toISOString(),
  },
});
engine.subscribe({
  complete: () => {
    process.exit(engine.getSnapshot().output?.exitCode ?? 1);
  },
  error: (error) => {
    console.error(`engine: ${String(error)}`);
    process.exit(1);
  },
});
engine.start();
