import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import packageJson from '../../package.json' with { type: 'json' };
import type { WorkerMessage } from '../supervisor/worker-message';
import { startWorker } from './start';

const heartbeatIntervalMs = 1000;

const home = process.env.ARGO_HOME ?? join(homedir(), '.argo');
const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65535)
  .parse(process.env.ARGO_SERVER_PORT ?? 7337);

mkdirSync(join(home, 'logs'), { recursive: true });
const log = (line: string) => {
  const stamped = `${new Date().toISOString()} worker ${process.pid}: ${line}`;
  console.log(stamped);
  appendFileSync(join(home, 'logs', 'worker.log'), `${stamped}\n`);
};

const send = (message: WorkerMessage) => process.send?.(message);

const worker = await startWorker({
  home,
  port,
  version: packageJson.version,
}).catch((error: unknown) => {
  log(`could not start: ${String(error)}`);
  process.exit(1);
});

log(`listening on 127.0.0.1:${port}`);
send({ type: 'ready', port });
const heartbeat = setInterval(
  () => send({ type: 'heartbeat' }),
  heartbeatIntervalMs,
);

const stop = (reason: string) => {
  log(`stopping: ${reason}`);
  clearInterval(heartbeat);
  worker.close();
  process.exit(0);
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
// The supervisor (or Node's watcher) is gone, so nobody can restart or stop this worker.
process.on('disconnect', () => stop('IPC channel closed'));
