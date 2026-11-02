import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { environmentSeedOptions } from './seed-options.mts';
import { startSeededServer } from './seed.mts';

// Starts a fixture Server holding a seed tier and keeps it up until stopped, so a profile has long Sessions to open. A Turn in any of them streams at write pressure.
const directory = await mkdtemp(path.join(os.tmpdir(), 'argo-seed-'));

const server = await startSeededServer(
  directory,
  environmentSeedOptions(),
  Object.fromEntries(
    appFixtureAgentIds.map((id) => [
      id,
      { scenario: 'write-pressure' as const },
    ]),
  ),
);

console.log(`Server: ${server.serverUrl}`);

console.log(`Long Session: ${server.longSessionTitle}`);

await new Promise((stopped) => {
  process.once('SIGINT', stopped);
  process.once('SIGTERM', stopped);
});

await server.stop();

await rm(directory, { recursive: true, force: true });
