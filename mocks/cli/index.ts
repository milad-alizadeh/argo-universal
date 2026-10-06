import type { AgentCommandOf, AgentEvent, AgentReady } from '@repo/agents';
import {
  feedEvents as claudeFeedEvents,
  recordedPrompt as claudeRecordedPrompt,
} from './claude/feed.ts';
import { newSessionMock as claudeNewSessionMock } from './claude/new-session.ts';
import { recordedRequestAnswer as claudeRequestAnswer } from './claude/request-answer.ts';
import { recordedTitle } from './claude/titles.ts';
import { writeMockClaude } from './claude/write-mock-claude.ts';
import { writeClaudeTranscript } from './claude/write-transcript.ts';
import {
  feedEvents as codexFeedEvents,
  recordedPrompt as codexRecordedPrompt,
} from './codex/feed.ts';
import { newSessionMock as codexNewSessionMock } from './codex/new-session.ts';
import { recordedRequestAnswer as codexRequestAnswer } from './codex/request-answer.ts';
import { writeMockCodex } from './codex/write-mock-codex.ts';
import { writeCodexTranscript } from './codex/write-transcript.ts';
import type { MockCliOptions } from './mock-cli.ts';
import type { RecordedRequestAnswer } from './request-answer.ts';

export interface MockCli {
  recordedTitle?: () => string;
  recordedRequestAnswer(recording: string): RecordedRequestAnswer;
  feedEvents(recording: string): AgentEvent[];
  // The first prompt a recording sent, or undefined when it holds none.
  recordedPrompt(
    recording: string,
  ): AgentCommandOf<'agent.prompt'>['content'] | undefined;
  newSessionMock(): {
    configOptions: AgentReady['configOptions'];
    configOptionsByModel: AgentReady['configOptions'][];
    prompt: AgentCommandOf<'agent.prompt'>['content'];
  };
  // Writes the mock CLI into `directory` under the name the adapter runs from PATH.
  write: (directory: string, options: MockCliOptions) => Promise<string>;
  // Recordings of a Turn with edits and commands, and of a Turn cancelled during a command.
  recordings: {
    turn: string;
    cancelledTurn: string;
    commandOutcomes?: string;
    editStates?: string;
    editFailure?: string;
  };
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
    recordedRequestAnswer: codexRequestAnswer,
    feedEvents: codexFeedEvents,
    recordedPrompt: codexRecordedPrompt,
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
      editStates: 'edit-states',
      editFailure: 'edit-failure',
    },
    writeTranscript: writeCodexTranscript,
  },
  claude: {
    recordedTitle,
    recordedRequestAnswer: claudeRequestAnswer,
    feedEvents: claudeFeedEvents,
    recordedPrompt: claudeRecordedPrompt,
    write: writeMockClaude,
    newSessionMock: claudeNewSessionMock,
    recordings: { turn: 'edit-and-command', cancelledTurn: 'interrupt' },
    writeTranscript: writeClaudeTranscript,
  },
};
