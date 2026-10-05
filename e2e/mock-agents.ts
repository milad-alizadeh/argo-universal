import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { mockClis } from '@repo/mocks/cli';

// A PATH that finds the mock Agent CLIs in `directory` first.
export const mockAgentPath = (directory: string) =>
  [directory, process.env.PATH ?? ''].join(path.delimiter);

// Writes every Agent's mock CLI into `directory` and returns its PATH, so an e2e Server never starts a real Agent CLI (AGENTS.md).
export async function writeMockAgents(directory: string) {
  await mkdir(directory, { recursive: true });
  await Promise.all(
    Object.values(mockClis).map((mockCli) =>
      mockCli.write(directory, { recording: mockCli.recordings.turn }),
    ),
  );
  return mockAgentPath(directory);
}

// Run before the web project's Server: `node --import tsx mock-agents.ts <directory>`.
if (process.argv[1] === import.meta.filename) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Name the directory for the mock Agent CLIs');
  await writeMockAgents(directory);
}
