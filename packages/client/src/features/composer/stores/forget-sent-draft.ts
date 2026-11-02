import type { ComposerDraft } from '../components/composer/composer';
import { sameAttachments } from '../utils/draft-as-sent';
import type { DraftKey } from '../utils/draft-key';
import { keptAttachments } from './kept-attachments';
import { keptDrafts } from './kept-draft';

type SentDraftListener = (key: DraftKey, sent: ComposerDraft) => void;

const listeners = new Set<SentDraftListener>();

// Tells an open Composer of each forgotten draft, since the page that sent it may be gone and this one may hold the draft.
export function onSentDraftForgotten(listener: SentDraftListener): () => void {
  listeners.add(listener);

  return () => void listeners.delete(listener);
}

function tellListeners(key: DraftKey, sent: ComposerDraft): void {
  for (const listener of listeners) listener(key, sent);
}

async function isAsSent(key: DraftKey, sent: ComposerDraft): Promise<boolean> {
  const text = await keptDrafts.load(key);
  const { attachments } = keptAttachments.load(key);

  return text === sent.text && sameAttachments(attachments, sent.attachments);
}

// Forgets a draft whole once its Session exists; text or Attachments changed since the send make it a newer draft, which stays whole.
export async function forgetSentDraft(
  key: DraftKey | undefined,
  sent: ComposerDraft,
): Promise<void> {
  if (!key || !(await isAsSent(key, sent))) return;
  keptDrafts.keep(key, '');
  keptAttachments.keep(key, [], new Map());
  tellListeners(key, sent);
}
