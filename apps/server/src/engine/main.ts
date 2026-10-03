import { homedir } from 'node:os';
import { join } from 'node:path';
import { createNodeMachineLog } from '@repo/machine-log/node';
import { createActor } from 'xstate';
import { z } from 'zod';
import packageJson from '../../package.json' with { type: 'json' };
import { engineMachine } from './machine';

const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65535)
  .parse(process.env.ARGO_SERVER_PORT ?? 7337);

const home = process.env.ARGO_HOME ?? join(homedir(), '.argo');
const engine = createActor(engineMachine, {
  inspect: createNodeMachineLog({ home, processName: 'engine' }),
  input: {
    home,
    port,
    version: packageJson.version,
    startedAt: new Date().toISOString(),
  },
});
engine.subscribe({
  complete: () => process.exit(engine.getSnapshot().output?.exitCode ?? 1),
  error: (error) => {
    console.error(`engine: ${String(error)}`);
    process.exit(1);
  },
});
engine.start();
