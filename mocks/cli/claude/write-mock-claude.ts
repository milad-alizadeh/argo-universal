import path from 'node:path';
import { type MockCliOptions, writeMockCliShim } from '../mock-cli.ts';

// Writes a `claude` into `directory` that replays a recording from ./recordings over stream-json.
export const writeMockClaude = (
  directory: string,
  options: MockCliOptions,
): Promise<string> =>
  writeMockCliShim({
    directory,
    name: 'claude',
    script: path.join(import.meta.dirname, 'mock-claude.ts'),
    ...options,
  });
