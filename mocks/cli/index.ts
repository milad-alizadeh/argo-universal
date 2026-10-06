import type { AgentCommandOf, AgentEvent, AgentReady } from '@repo/agents';
import { feedEvents as claudeFeedEvents } from './claude/feed.ts';
import { newSessionMock as claudeNewSessionMock } from './claude/new-session.ts';
import { writeMockClaude } from './claude/write-mock-claude.ts';
import { writeClaudeTranscript } from './claude/write-transcript.ts';
import { feedEvents as codexFeedEvents } from './codex/feed.ts';
import { newSessionMock as codexNewSessionMock } from './codex/new-session.ts';
import { writeMockCodex } from './codex/write-mock-codex.ts';
import { writeCodexTranscript } from './codex/write-transcript.ts';
import type { MockCliOptions } from './mock-cli.ts';

export interface MockCli {
  feedEvents(recording: string): AgentEvent[];
  newSessionMock(): {
    configOptions: AgentReady['configOptions'];
    configOptionsByModel: AgentReady['configOptions'][];
    prompt: AgentCommandOf<'agent.prompt'>['content'];
  };
  // Writes the mock CLI into `directory` under the name the adapter runs from PATH.
  write: (directory: string, options: MockCliOptions) => Promise<string>;
  // Recordings of a Turn with edits and commands, and of a Turn cancelled during a command.
  recordings: { turn: string; cancelledTurn: string; commandOutcomes?: string };
  apiKeyVariables?: string[];
  connectionFailures?: {
    environment: Record<string, string>;
    message: string;
  }[];
  // Writes the vendor transcript a resume reads, and returns the environment variables that point to it.
  writeTranscript: (
    directory: string,
    cwd: string,
    vendorSessionId: string,
  ) => Record<string, string>;
}

// Each Agent adapter's mock CLI, by the id the adapter registers.
export const mockClis: Record<string, MockCli> = {
  codex: {
    feedEvents: codexFeedEvents,
    write: writeMockCodex,
    newSessionMock: codexNewSessionMock,
    apiKeyVariables: ['OPENAI_API_KEY', 'CODEX_API_KEY'],
    connectionFailures: [
      {
        environment: { MOCK_CLI_ACCOUNT_TYPE: 'apiKey' },
        message: 'Sign in to Codex with ChatGPT',
      },
    ],
    recordings: {
      turn: 'edit-and-command',
      cancelledTurn: 'interrupt',
      commandOutcomes: 'command-outcomes',
    },
    writeTranscript: writeCodexTranscript,
  },
  claude: {
    feedEvents: claudeFeedEvents,
    write: writeMockClaude,
    newSessionMock: claudeNewSessionMock,
    recordings: { turn: 'edit-and-command', cancelledTurn: 'interrupt' },
    writeTranscript: writeClaudeTranscript,
  },
};
