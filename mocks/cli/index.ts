import { writeMockClaude } from './claude/write-mock-claude.ts';
import { writeClaudeTranscript } from './claude/write-transcript.ts';
import type { MockCliOptions } from './mock-cli.ts';

export interface MockCli {
  // Writes the mock CLI into `directory` under the name the adapter runs from PATH.
  write: (directory: string, options: MockCliOptions) => Promise<string>;
  // Recordings of a Turn with edits and commands, and of a Turn cancelled during a command.
  recordings: { turn: string; cancelledTurn: string };
  // Writes the vendor transcript a resume reads, and returns the environment variables that point to it.
  writeTranscript: (
    directory: string,
    cwd: string,
    vendorSessionId: string,
  ) => Record<string, string>;
}

// Each Agent adapter's mock CLI, by the id the adapter registers.
export const mockClis: Record<string, MockCli> = {
  claude: {
    write: writeMockClaude,
    recordings: { turn: 'edit-and-command', cancelledTurn: 'interrupt' },
    writeTranscript: writeClaudeTranscript,
  },
};
