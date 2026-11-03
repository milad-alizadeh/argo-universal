import { fileURLToPath } from 'node:url';
import { startVitest } from 'vitest/node';

// Rewrites the scripted ACP recording through the real Engine and SQL Feed reader.
const vitest = await startVitest('test', [], {
  root: fileURLToPath(new URL('../packages/engine/', import.meta.url)),
  config: false,
  include: ['mocks/report-recording.ts'],
  watch: false,
  maxWorkers: 1,
  fsModuleCache: true,
});

await vitest.close();

process.exitCode = vitest.state.getCountOfFailedTests() > 0 ? 1 : 0;
