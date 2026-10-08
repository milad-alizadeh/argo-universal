// jscpd ignores this import list (`ignorePattern` in .jscpd.json): the router and service name the same contracts, a false positive.
import type {
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
  SessionAnswerPlanProposalInput,
  SessionAnswerPlanProposalOutput,
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
  SessionRenameInput,
  SessionRenameOutput,
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';

export interface SessionService {
  answerPermission(
    input: SessionAnswerPermissionInput,
  ): Promise<SessionAnswerPermissionOutput>;
  answerElicitation(
    input: SessionAnswerElicitationInput,
  ): Promise<SessionAnswerElicitationOutput>;
  answerPlanProposal(
    input: SessionAnswerPlanProposalInput,
  ): Promise<SessionAnswerPlanProposalOutput>;

  list(input: SessionListInput): Promise<SessionListOutput>;
  listUpdates(
    signal: AbortSignal | undefined,
  ): AsyncIterable<SessionListUpdate>;
  counts(signal: AbortSignal | undefined): AsyncIterable<SessionCounts>;
  new: (input: SessionNewInput) => Promise<SessionNewOutput>;
  prompt(input: SessionPromptInput): Promise<SessionPromptOutput>;
  rename(input: SessionRenameInput): Promise<SessionRenameOutput>;
  cancel(input: SessionCancelInput): Promise<SessionCancelOutput>;
  setConfigOption(
    input: SessionSetConfigOptionInput,
  ): Promise<SessionSetConfigOptionOutput>;
  changes(input: SessionChangesInput): Promise<SessionChangesOutput>;
  diff(input: SessionDiffInput): Promise<SessionDiffOutput>;
}
