import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/*
 * A stand-in Engine for Supervisor process tests: it launches one descendant the way an Engine launches an Agent,
 * records its own and the descendant's pid, then reports ready. ARGO_FIXTURE_IGNORE_TERM makes it ignore SIGTERM.
 */
const descendant = spawn(
  process.execPath,
  ['-e', 'setInterval(() => {}, 1000)'],
  { stdio: 'ignore' },
);

writeFileSync(
  process.env.ARGO_FIXTURE_PIDFILE ?? '',
  JSON.stringify({ engine: process.pid, descendant: descendant.pid }),
);

if (process.env.ARGO_FIXTURE_IGNORE_TERM) process.on('SIGTERM', () => {});

process.send?.({ type: 'ready', port: 7337 });

setInterval(() => {}, 1000);
