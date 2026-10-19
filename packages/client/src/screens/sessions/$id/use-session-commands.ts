import { useMutation } from '@tanstack/react-query';
import { type ComposerDraft, useAttachmentDraft } from '#features/composer';
import { type ServerMutation, type TRPC, useTRPC } from '#features/connection';
import {
  type SessionConfigChange,
  useSessionConfigChange,
} from '#features/sessions';

type SessionMutation<Name extends 'prompt' | 'cancel'> = ServerMutation<
  TRPC['session'][Name]
>;

type AttachmentDraft = ReturnType<typeof useAttachmentDraft>;

export type SessionCommands = Omit<
  AttachmentDraft,
  'clearDraft' | 'uploadDraftAsPrompt'
> & {
  promptSession: SessionMutation<'prompt'>;
  cancelTurn: SessionMutation<'cancel'>;
  setConfigOption: SessionConfigChange['setConfigOption'];
  changeConfig: SessionConfigChange['change'];
  sendDraft: (sent: ComposerDraft) => Promise<void>;
};

interface SessionCommandTarget {
  sessionId: string;
  resumeAfterCommand: () => void;
  agent: string | undefined;
}

type DraftCommands = Omit<
  SessionCommands,
  'cancelTurn' | 'setConfigOption' | 'changeConfig'
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

function useDraftCommands({
  sessionId,
  resumeAfterCommand,
}: SessionCommandTarget): DraftCommands {
  const { clearDraft, uploadDraftAsPrompt, ...draft } = useAttachmentDraft({
    type: 'session',
    sessionId,
  });

  const promptSession = usePromptSession({ clearDraft, resumeAfterCommand });
  const sendDraft = draftSender(sessionId, promptSession, uploadDraftAsPrompt);

  return { ...draft, promptSession, sendDraft };
}

function usePromptSession({
  clearDraft,
  resumeAfterCommand,
}: PromptFollowUp): SessionMutation<'prompt'> {
  const trpc = useTRPC();

  const onSuccess = (): void => {
    clearDraft();
    resumeAfterCommand();
  };

  return useMutation(trpc.session.prompt.mutationOptions({ onSuccess }));
}

function useCancelTurn(onSuccess: () => void): SessionMutation<'cancel'> {
  const trpc = useTRPC();

  return useMutation(trpc.session.cancel.mutationOptions({ onSuccess }));
}

function draftSender(
  sessionId: string,
  promptSession: SessionMutation<'prompt'>,
  uploadDraftAsPrompt: AttachmentDraft['uploadDraftAsPrompt'],
): (sent: ComposerDraft) => Promise<void> {
  return async (sent) => {
    promptSession.reset();
    const prompt = await uploadDraftAsPrompt(sent);

    if (prompt?.length) promptSession.mutate({ sessionId, prompt });
  };
}
