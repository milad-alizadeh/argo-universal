import { fileURLToPath } from 'node:url';
import { startVitest } from 'vitest/node';

// Rewrites mocks/app/user-message-recordings.json by sending each prompt through the real Engine with the scripted Agent.
const engine = fileURLToPath(new URL('../packages/engine/', import.meta.url));

const vitest = await startVitest('test', [], {
  root: engine,
  config: false,
  include: ['mocks/user-message-recording.ts'],
  watch: false,
});

await vitest.close();

process.exitCode = vitest.state.getCountOfFailedTests() > 0 ? 1 : 0;
