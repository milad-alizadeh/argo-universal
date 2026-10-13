import { existsSync, writeFileSync } from 'node:fs';

process.on('SIGTERM', () => {
  writeFileSync(process.env.ARGO_PROBE_EXIT_MARKER, String(process.pid));
  const waiting = setInterval(() => {
    if (!existsSync(process.env.ARGO_PROBE_RELEASE)) return;
    clearInterval(waiting);
    process.exit(0);
  }, 10);
});
