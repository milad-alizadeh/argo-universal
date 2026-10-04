import path from 'node:path';
import { type MockCliOptions, writeMockCliShim } from '../mock-cli.ts';

// Writes a `codex` into `directory` whose `app-server` replays a recording from ./recordings.
export const writeMockCodex = (directory: string, options: MockCliOptions) =>
  writeMockCliShim({
    directory,
    name: 'codex',
    script: path.join(import.meta.dirname, 'mock-codex.ts'),
    ...options,
  });
