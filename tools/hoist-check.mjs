import path from 'node:path';
import { buildHoistingReport } from './hoist-check/report.mjs';

try {
  process.stdout.write(
    buildHoistingReport(path.resolve(process.argv[2] ?? '.')),
  );
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`hoist-check: could not read the workspace: ${reason}`);
}
