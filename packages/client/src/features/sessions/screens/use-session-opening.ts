import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { type ComposerDraft, useAttachmentDraft } from '#features/composer';
import {
  type EmptySession,
  type EmptySessionActor,
  useEmptySession,
} from '../hooks/use-empty-session';
import { toNewSessionInput } from '../state/open-session';
import { type StartingFeed, startingFeed } from '../state/starting-feed';
import type { NewSessionData } from './use-new-session-data';

export type AttachmentDraft = ReturnType<typeof useAttachmentDraft>;

interface SentFirstPrompt {
  starting: StartingFeed | undefined;
  show: (draft: ComposerDraft) => void;
  clear: () => void;
}

export interface SessionOpening {
  session: EmptySession;
  // True while the first prompt uploads or waits for the Session.
  sending: boolean;
  starting: StartingFeed | undefined;
  sendFirstPrompt: (draft: ComposerDraft) => Promise<void>;
}

interface FirstPromptSend {
  attachmentDraft: AttachmentDraft;
  actor: EmptySessionActor;
  sent: SentFirstPrompt;
}

// The first prompt as sent, shown in the Feed until the Session has it; a failure clears it and keeps the draft.
function useSentFirstPrompt(sending: boolean): SentFirstPrompt {
  const [sent, setSent] = useState<{ draft: ComposerDraft; at: number }>();
  const shown = sending ? sent : undefined;

  const starting = useMemo(
    () => shown && startingFeed(shown.draft, shown.at),
    [shown],
  );

  return {
    starting,
    show: (draft) => setSent({ draft, at: Date.now() }),
    clear: () => setSent(undefined),
  };
}

// The first prompt now belongs to the Session, so the Project's kept draft goes. The page unmounts in the hand-off's own update, so this listens to the actor, not a render.
function useClearDraftOnHandOff(
  actor: EmptySessionActor,
  clearDraft: () => void,
): void {
  const clear = useEffectEvent(clearDraft);
  useEffect(() => {
    const subscription = actor.subscribe((snapshot) => {
      if (snapshot.status === 'done') clear();
    });

    return (): void => subscription.unsubscribe();
  }, [actor]);
}

const isSending = (
  attachmentDraft: AttachmentDraft,
  session: EmptySession,
): boolean =>
  [
    attachmentDraft.uploading,
    session.context.pendingPrompt !== undefined,
    session.handedOff,
  ].some(Boolean);

// Uploads the draft's images, then queues the draft as the first prompt until the Session is ready.
async function sendFirstPrompt(
  { attachmentDraft, actor, sent }: FirstPromptSend,
  draft: ComposerDraft,
): Promise<void> {
  sent.show(draft);
  const prompt = await attachmentDraft.uploadDraftAsPrompt(draft);

  if (prompt?.length) actor.send({ type: 'send', prompt });
  else sent.clear();
}

function useFirstPrompt(
  attachmentDraft: AttachmentDraft,
  session: EmptySession,
): Omit<SessionOpening, 'session'> {
  const sending = isSending(attachmentDraft, session);
  const sent = useSentFirstPrompt(sending);
  const send = { attachmentDraft, actor: session.actor, sent };

  return {
    sending,
    starting: sent.starting,
    sendFirstPrompt: (draft) => sendFirstPrompt(send, draft),
  };
}

// New Session's empty Session, opened for the reader's choices, and the first prompt it takes.
export function useSessionOpening(
  attachmentDraft: AttachmentDraft,
  data: NewSessionData,
  connected: boolean,
): SessionOpening {
  const session = useEmptySession(toNewSessionInput(data.choices), connected);
  useClearDraftOnHandOff(session.actor, attachmentDraft.clearDraft);

  return { session, ...useFirstPrompt(attachmentDraft, session) };
}
