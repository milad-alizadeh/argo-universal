import type {
  ComposerAttachment,
  ComposerDraft,
} from '../components/composer/composer';
import type { DraftKey } from '../utils/draft-key';
import { keptAttachments } from './kept-attachments';
import { keptDrafts } from './kept-draft';

const sameAttachments = (
  first: readonly ComposerAttachment[],
  second: readonly ComposerAttachment[],
): boolean =>
  first.length === second.length &&
  first.every(({ id }, index) => id === second[index]?.id);

const textAsSent = (kept: string, sent: string): boolean =>
  !kept || kept === sent;

async function isAsSent(key: DraftKey, sent: ComposerDraft): Promise<boolean> {
  const text = await keptDrafts.load(key);
  const { attachments } = keptAttachments.load(key);

  return (
    textAsSent(text, sent.text) &&
    sameAttachments(attachments, sent.attachments)
  );
}

// Forgets a draft whole once its Session exists; text or Attachments changed since the send make it a newer draft, which stays whole.
export async function forgetSentDraft(
  key: DraftKey | undefined,
  sent: ComposerDraft,
): Promise<void> {
  if (!key || !(await isAsSent(key, sent))) return;
  keptDrafts.keep(key, '');
  keptAttachments.keep(key, [], new Map());
}
