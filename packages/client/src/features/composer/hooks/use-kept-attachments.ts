import { useEffect } from 'react';
import { keptAttachments } from '../stores/kept-attachments';
import type { AttachmentDraftState } from '../utils/attachment-draft';
import type { DraftKey } from '../utils/draft-key';

// Keeps the draft's Attachments for its owner, so leaving the page does not lose them.
export function useKeptAttachments(
  key: DraftKey | undefined,
  { draft, files, ownerKey }: AttachmentDraftState,
): void {
  useEffect(() => {
    if (key && key === ownerKey)
      keptAttachments.keep(key, draft.attachments, files);
  }, [key, ownerKey, draft.attachments, files]);
}
