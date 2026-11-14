import { type RefObject, useMemo, useRef, useState } from 'react';
import { type ComposerDraft, useAttachmentDraft } from '#features/composer';
import {
  type EmptySessionStore,
  toNewSessionInput,
  type StartingFeed,
  startingFeed,
} from '#features/sessions';
import { useFollowUpSuggestionsPreference } from '#features/settings';
import { type EmptySession, useEmptySession } from './use-empty-session';
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
  // Retry, or a finished sign-in: the store opens its checkout again, and a New worktree sends the current draft.
  openAgain: () => void;
}

interface FirstPromptSend {
  attachmentDraft: AttachmentDraft;
  store: EmptySessionStore;
  sent: SentFirstPrompt;
  // Forgets the draft as sent and for the owner it was sent from, even once the page has gone.
  forgetSent: RefObject<(() => void) | null>;
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

const isSending = (
  attachmentDraft: AttachmentDraft,
  session: EmptySession,
): boolean =>
  [attachmentDraft.uploading, session.pendingPrompt, session.handedOff].some(
    Boolean,
  );

// Uploads the draft's images, then queues the draft as the first prompt until the Session is ready.
async function sendFirstPrompt(
  { attachmentDraft, store, sent, forgetSent }: FirstPromptSend,
  draft: ComposerDraft,
): Promise<void> {
  sent.show(draft);
  forgetSent.current = (): void => attachmentDraft.forgetSentDraft(draft);
  const prompt = await attachmentDraft.uploadDraftAsPrompt(draft);

  if (prompt?.length) store.send(prompt);
  else sent.clear();
}

// Retry, or a finished sign-in: the store opens its checkout again, and a New worktree sends the draft as it is now.
const openAgain = (send: FirstPromptSend): void =>
  send.store.openAgain({
    by: 'user',
    sendDraft: () => void sendFirstPrompt(send, send.attachmentDraft.draft),
  });

function useFirstPrompt(
  attachmentDraft: AttachmentDraft,
  session: EmptySession,
  forgetSent: FirstPromptSend['forgetSent'],
): Omit<SessionOpening, 'session'> {
  const sending = isSending(attachmentDraft, session);
  const sent = useSentFirstPrompt(sending);
  const send = { attachmentDraft, store: session.store, sent, forgetSent };

  return {
    sending,
    starting: sent.starting,
    sendFirstPrompt: (draft) => sendFirstPrompt(send, draft),
    openAgain: () => openAgain(send),
  };
}

// New Session's Empty Session, opened for the reader's choices, and the first prompt it takes.
export function useSessionOpening(
  attachmentDraft: AttachmentDraft,
  data: NewSessionData,
  connected: boolean,
): SessionOpening {
  const forgetSent = useRef<(() => void) | null>(null);

  const session = useEmptySession(
    { input: useStartingInput(data), connected },
    {
      clearDraft: attachmentDraft.clearDraft,
      forgetSentDraft: () => forgetSent.current?.(),
    },
  );

  return { session, ...useFirstPrompt(attachmentDraft, session, forgetSent) };
}

function useStartingInput(
  data: NewSessionData,
): ReturnType<typeof toNewSessionInput> {
  const { enabled } = useFollowUpSuggestionsPreference();
  const initial = toNewSessionInput(data.choices);

  return initial
    ? { ...initial, followUpSuggestions: enabled === true }
    : undefined;
}
