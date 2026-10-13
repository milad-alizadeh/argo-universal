import { type Dispatch, useEffect } from 'react';
import type { AttachmentDraftEvent } from '../state/attachment-draft';
import type { DraftKey } from '../state/draft-key';
import { keptDrafts } from '../state/kept-draft';
// Empties the text when the draft's owner changes, then restores what this Device kept for the new owner.
export function useKeptDraft(
  key: DraftKey | undefined,
  dispatch: Dispatch<AttachmentDraftEvent>,
): void {
  useEffect(() => {
    if (!key) return;
    dispatch({ type: 'ownerChanged', key });
    void keptDrafts.load(key).then((text) => {
      dispatch({ type: 'restored', key, text });
    });
  }, [key, dispatch]);
}
