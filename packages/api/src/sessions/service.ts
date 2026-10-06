import type {
  SessionCancelInput,
  SessionCancelOutput,
  SessionChangesInput,
  SessionChangesOutput,
  SessionCounts,
  SessionDiffInput,
  SessionDiffOutput,
  SessionListInput,
  SessionListOutput,
  SessionListUpdate,
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';

export interface SessionService {
  list(input: SessionListInput): Promise<SessionListOutput>;
  listUpdates(
    signal: AbortSignal | undefined,
  ): AsyncIterable<SessionListUpdate>;
  counts(signal: AbortSignal | undefined): AsyncIterable<SessionCounts>;
  new: (input: SessionNewInput) => Promise<SessionNewOutput>;
  prompt(input: SessionPromptInput): Promise<SessionPromptOutput>;
  cancel(input: SessionCancelInput): Promise<SessionCancelOutput>;
  setConfigOption(
    input: SessionSetConfigOptionInput,
  ): Promise<SessionSetConfigOptionOutput>;
  changes(input: SessionChangesInput): Promise<SessionChangesOutput>;
  diff(input: SessionDiffInput): Promise<SessionDiffOutput>;
}
