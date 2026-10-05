import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { mockClis } from '@repo/mocks/cli';

// Writes every Agent's mock CLI into `directory` and returns a PATH that finds them first, so an e2e Server never starts a real Agent CLI (AGENTS.md).
export async function writeMockAgents(directory: string) {
  await mkdir(directory, { recursive: true });
  for (const mockCli of Object.values(mockClis))
    await mockCli.write(directory, { recording: mockCli.recordings.turn });
  return [directory, process.env.PATH ?? ''].join(path.delimiter);
}

// Run before the web project's Server: `node --import tsx mock-agents.ts <directory>`.
if (process.argv[1] === import.meta.filename) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Name the directory for the mock Agent CLIs');
  await writeMockAgents(directory);
}
