import { type Dispatch, useEffect } from 'react';
import { keptAttachments } from '../stores/kept-attachments';
import { keptDrafts } from '../stores/kept-draft';
import type { AttachmentDraftEvent } from '../utils/attachment-draft';
import type { DraftKey } from '../utils/draft-key';

// Empties the text when the draft's owner changes, then restores its Attachments and the seed, or else what this Device kept for the new owner.
export function useKeptDraft(
  key: DraftKey | undefined,
  dispatch: Dispatch<AttachmentDraftEvent>,
  seed?: string,
): void {
  useEffect(() => {
    if (key) restoreDraft(key, dispatch, seed);
  }, [key, dispatch, seed]);
}

function restoreDraft(
  key: DraftKey,
  dispatch: Dispatch<AttachmentDraftEvent>,
  seed: string | undefined,
): void {
  dispatch({ type: 'ownerChanged', key, kept: keptAttachments.load(key) });

  if (seed !== undefined) {
    dispatch({ type: 'restored', key, text: seed });

    return;
  }

  void keptDrafts.load(key).then((text) => {
    dispatch({ type: 'restored', key, text });
  });
}
