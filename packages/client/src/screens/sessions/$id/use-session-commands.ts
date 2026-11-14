import type { ContentBlock } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import {
  type ComposerDraft,
  useAttachmentDraft,
  useFollowUpDismissal,
} from '#features/composer';
import { type ServerMutation, type TRPC, useTRPC } from '#features/connection';
import {
  type SessionConfigChange,
  useSessionConfigChange,
} from '#features/sessions';
import { useFollowUpSuggestionsPreference } from '#features/settings';
import { useQueueCommand, type QueueCommandSender } from './use-prompt-queue';
import { useRetryPrompt } from './use-retry-prompt';

type SessionMutation<Name extends 'submit' | 'cancel'> = ServerMutation<
  TRPC['session'][Name]
>;

type AttachmentDraft = ReturnType<typeof useAttachmentDraft>;

export type SessionCommands = Omit<
  AttachmentDraft,
  'clearDraft' | 'uploadDraftAsPrompt'
> & {
  followUpSuggestions?: boolean;
  dismissedFollowUpTurnId?: string;
  dismissFollowUp?: (turnId: string) => void;
  promptSession: SessionMutation<'submit'>;
  cancelTurn: SessionMutation<'cancel'>;
  setConfigOption: SessionConfigChange['setConfigOption'];
  changeConfig: SessionConfigChange['change'];
  queueCommand: QueueCommandSender;
  sendDraft: (sent: ComposerDraft) => Promise<void>;
  // Sends a stopped Turn's prompt again and leaves the draft as it is.
  retryPrompt: (prompt: ContentBlock[]) => void;
};

interface SessionCommandTarget {
  sessionId: string;
  resumeAfterCommand: () => void;
  agent: string | undefined;
}

type DraftCommands = Omit<
  SessionCommands,
  'cancelTurn' | 'setConfigOption' | 'changeConfig' | 'queueCommand'
>;

interface PromptFollowUp {
  clearDraft: () => void;
  resumeAfterCommand: () => void;
}

// Draft uploads and successful commands resume a Feed that has closed.
export function useSessionCommands(
  target: SessionCommandTarget,
): SessionCommands {
  return {
    ...useDraftCommands(target),
    queueCommand: useQueueCommand(target),
    cancelTurn: useCancelTurn(target.resumeAfterCommand),
    ...useConfigCommands(target),
  };
}

function useConfigCommands({
  sessionId,
  resumeAfterCommand,
}: SessionCommandTarget): Pick<
  SessionCommands,
  'setConfigOption' | 'changeConfig'
> {
  const { setConfigOption, change } = useSessionConfigChange(
    sessionId,
    resumeAfterCommand,
  );

  return { setConfigOption, changeConfig: change };
}

function useDraftCommands(target: SessionCommandTarget): DraftCommands {
  const followUp = useFollowUpCommands(target.sessionId);
  const draft = usePromptDraft(target, followUp.followUpSuggestions === true);

  const retryPrompt = useRetryPrompt(
    target.sessionId,
    target.resumeAfterCommand,
  );

  return { ...draft, ...followUp, retryPrompt };
}

function useFollowUpCommands(
  sessionId: string,
): Pick<
  SessionCommands,
  'followUpSuggestions' | 'dismissedFollowUpTurnId' | 'dismissFollowUp'
> {
  const dismissal = useFollowUpDismissal(sessionId);
  const { enabled: followUpSuggestions } = useFollowUpSuggestionsPreference();

  return {
    followUpSuggestions,
    dismissedFollowUpTurnId: dismissal.turnId,
    dismissFollowUp: dismissal.dismiss,
  };
}

function usePromptDraft(
  target: SessionCommandTarget,
  followUpSuggestions: boolean,
): Omit<DraftCommands, 'retryPrompt'> {
  const { clearDraft, uploadDraftAsPrompt, ...draft } = useAttachmentDraft({
    type: 'session',
    sessionId: target.sessionId,
  });

  const promptSession = usePromptSession({ ...target, clearDraft });

  const sendDraft = draftSender(
    { sessionId: target.sessionId, promptSession, followUpSuggestions },
    uploadDraftAsPrompt,
  );

  return { ...draft, promptSession, sendDraft };
}

function usePromptSession({
  clearDraft,
  resumeAfterCommand,
}: PromptFollowUp): SessionMutation<'submit'> {
  const trpc = useTRPC();

  const onSuccess = (): void => {
    clearDraft();
    resumeAfterCommand();
  };

  return useMutation(trpc.session.submit.mutationOptions({ onSuccess }));
}

function useCancelTurn(onSuccess: () => void): SessionMutation<'cancel'> {
  const trpc = useTRPC();

  return useMutation(trpc.session.cancel.mutationOptions({ onSuccess }));
}

type DraftSendTarget = {
  sessionId: string;
  promptSession: SessionMutation<'submit'>;
  followUpSuggestions: boolean;
};

function draftSender(
  { sessionId, promptSession, followUpSuggestions }: DraftSendTarget,
  uploadDraftAsPrompt: AttachmentDraft['uploadDraftAsPrompt'],
): (sent: ComposerDraft) => Promise<void> {
  return async (sent) => {
    promptSession.reset();
    const prompt = await uploadDraftAsPrompt(sent);

    if (prompt?.length)
      promptSession.mutate({ sessionId, prompt, followUpSuggestions });
  };
}
