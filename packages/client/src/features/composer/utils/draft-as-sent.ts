import type {
  ComposerAttachment,
  ComposerDraft,
} from '../components/composer/composer';
import type { AttachmentDraftState } from './attachment-draft';
import type { DraftKey } from './draft-key';

export const sameAttachments = (
  first: readonly ComposerAttachment[],
  second: readonly ComposerAttachment[],
): boolean =>
  first.length === second.length &&
  first.every(({ id }, index) => id === second[index]?.id);

// Kept text still loading counts as sent: this Device kept nothing newer, or the draft would not be forgotten.
const heldTextAsSent = (
  { draft, awaitedKey }: AttachmentDraftState,
  key: DraftKey,
  sent: ComposerDraft,
): boolean => awaitedKey === key || draft.text === sent.text;

// Whether a Composer still holds the draft as it was sent from this owner.
export const holdsSentDraft = (
  state: AttachmentDraftState,
  { key, sent }: { key: DraftKey; sent: ComposerDraft },
): boolean =>
  key === state.ownerKey &&
  heldTextAsSent(state, key, sent) &&
  sameAttachments(state.draft.attachments, sent.attachments);
