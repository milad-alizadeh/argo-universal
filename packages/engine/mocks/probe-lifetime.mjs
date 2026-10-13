import { writeFileSync } from 'node:fs';

// A real scripted Agent whose external process refuses graceful cleanup.
process.on('SIGTERM', () => {
  writeFileSync(process.env.ARGO_PROBE_EXIT_MARKER, String(process.pid));
});
