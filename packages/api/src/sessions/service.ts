import type {
  SessionCancelInput,
  SessionCancelOutput,
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';

export interface SessionService {
  new: (input: SessionNewInput) => Promise<SessionNewOutput>;
  prompt(input: SessionPromptInput): Promise<SessionPromptOutput>;
  cancel(input: SessionCancelInput): Promise<SessionCancelOutput>;
  setConfigOption(
    input: SessionSetConfigOptionInput,
  ): Promise<SessionSetConfigOptionOutput>;
}
