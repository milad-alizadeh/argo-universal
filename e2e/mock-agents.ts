import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { mockClis } from '@repo/mocks/cli';
import type { MockCliOptions } from '@repo/mocks/cli/mock-cli';

// A PATH with the mock Agent CLIs in `directory` and no inherited entries, so a real Agent CLI on this machine never stands in for a missing mock.
export const mockAgentPath = (directory: string) =>
  [directory, '/usr/bin', '/bin'].join(path.delimiter);

// Each Agent's mock CLI options by Agent id; an Agent left out replays its usual Turn.
export type MockAgents = Record<string, Partial<MockCliOptions>>;

// Writes every Agent's mock CLI into `directory` and returns its PATH, so an e2e Server never starts a real Agent CLI (AGENTS.md).
export async function writeMockAgents(
  directory: string,
  agents: MockAgents = {},
) {
  await mkdir(directory, { recursive: true });
  await Promise.all(
    Object.entries(mockClis).map(([agent, mockCli]) =>
      mockCli.write(directory, {
        recording: mockCli.recordings.turn,
        ...agents[agent],
      }),
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
