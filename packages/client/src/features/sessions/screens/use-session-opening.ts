import type { SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { type ComposerDraft, useAttachmentDraft } from '#features/composer';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import { toNewSessionInput } from '../state/open-session';
import { type StartingFeed, startingFeed } from '../state/starting-feed';
import type { NewSessionData } from './use-new-session-data';

export type AttachmentDraft = ReturnType<typeof useAttachmentDraft>;

interface NewSessionMutation {
  mutate: (input: SessionNewInput) => void;
  reset: () => void;
  isPending: boolean;
  error: { message: string } | null;
}

interface SentFirstPrompt {
  starting: StartingFeed | undefined;
  show: (draft: ComposerDraft) => void;
  clear: () => void;
}

export interface SessionOpening {
  newSession: NewSessionMutation;
  starting: StartingFeed | undefined;
  sendFirstPrompt: (draft: ComposerDraft) => Promise<void>;
}

type ChosenConfiguration = Pick<NewSessionData, 'choices' | 'configuration'>;

interface FirstPromptSend {
  attachmentDraft: AttachmentDraft;
  data: ChosenConfiguration;
  sent: SentFirstPrompt;
  newSession: NewSessionMutation;
}

// The first prompt as sent, shown in the Feed until the Session opens; a failure clears it and keeps the draft.
function useSentFirstPrompt(): SentFirstPrompt {
  const [sent, setSent] = useState<{ draft: ComposerDraft; at: number }>();
  const starting = useMemo(
    () => sent && startingFeed(sent.draft, sent.at),
    [sent],
  );
  return {
    starting,
    show: (draft) => setSent({ draft, at: Date.now() }),
    clear: () => setSent(undefined),
  };
}

function useNewSessionMutation(
  attachmentDraft: AttachmentDraft,
  onError: () => void,
): NewSessionMutation {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const onSuccess = ({ sessionId }: { sessionId: string }): void => {
    attachmentDraft.clearDraft();
    navigate({ to: 'session', id: sessionId }, { replace: true });
  };
  return useMutation(trpc.session.new.mutationOptions({ onSuccess, onError }));
}

const afterOpenFailed =
  (sent: SentFirstPrompt, agents: NewSessionData['agents']) => (): void => {
    sent.clear();
    void agents.refetch();
  };

const toFirstPromptInput = (
  prompt: SessionNewInput['prompt'] | undefined,
  { choices, configuration }: ChosenConfiguration,
): SessionNewInput | undefined =>
  prompt?.length
    ? toNewSessionInput(choices, configuration.configOptions, prompt)
    : undefined;

// Uploads the draft's images, then opens the Session with the draft as its first prompt; a failure keeps the draft.
async function sendFirstPrompt(
  { attachmentDraft, data, sent, newSession }: FirstPromptSend,
  draft: ComposerDraft,
): Promise<void> {
  newSession.reset();
  sent.show(draft);
  const prompt = await attachmentDraft.uploadDraftAsPrompt(draft);
  const input = toFirstPromptInput(prompt, data);
  if (input) newSession.mutate(input);
  else sent.clear();
}

export function useSessionOpening(
  attachmentDraft: AttachmentDraft,
  data: NewSessionData,
): SessionOpening {
  const sent = useSentFirstPrompt();
  const onFailure = afterOpenFailed(sent, data.agents);
  const newSession = useNewSessionMutation(attachmentDraft, onFailure);
  return {
    newSession,
    starting: sent.starting,
    sendFirstPrompt: (draft) =>
      sendFirstPrompt({ attachmentDraft, data, sent, newSession }, draft),
  };
}
