import type { BlobRef, SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { type Dispatch, useEffect, useReducer } from 'react';
import { useTRPC } from '#features/connection';
import type { ComposerDraft } from '../components/composer/composer';
import {
  type AttachmentDraftEvent,
  type AttachmentError,
  attachmentDraftReducer,
  emptyAttachmentDraft,
  type PickedAttachment,
  toAttachmentError,
  toUploadForms,
} from '../state/attachment-draft';
import { type DraftKey, type DraftOwner, draftKey } from '../state/draft-key';
import { draftPrompt } from '../state/draft-prompt';
import { keptDrafts } from '../state/kept-draft';
import { droppedFiles, pickFiles, pickImages } from './pick-attachments';
import type { DroppedFiles } from './use-file-drop';

export interface AttachmentDraft {
  draft: ComposerDraft;
  changeDraft: (next: ComposerDraft) => void;
  attachImages: () => Promise<void>;
  attachFiles: () => Promise<void>;
  attachDroppedFiles: (dropped: DroppedFiles) => Promise<void>;
  uploadDraftAsPrompt: (
    sent: ComposerDraft,
  ) => Promise<SessionNewInput['prompt'] | undefined>;
  clearDraft: () => void;
  uploading: boolean;
  attachmentError: AttachmentError;
}

function useAttachmentUpload(): ReturnType<
  typeof useMutation<BlobRef[], Error, FormData[]>
> {
  const upload = useTRPC().blob.upload.mutationOptions().mutationFn;
  return useMutation({
    mutationFn: (forms: FormData[], context) => {
      if (!upload) throw new Error('Blob upload mutation function is missing');
      return Promise.all(forms.map((form) => upload(form, context)));
    },
  });
}

// Empties the text when the draft's owner changes, then restores what this Device kept for the new owner.
function useKeptDraft(
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

// A Composer draft with attachments, and the prompt it sends once its attachments are uploaded. This Device keeps its text, not its attachments, per owner.
export function useAttachmentDraft(
  owner: DraftOwner | undefined,
): AttachmentDraft {
  const [state, dispatch] = useReducer(
    attachmentDraftReducer,
    emptyAttachmentDraft,
  );
  const attachmentUpload = useAttachmentUpload();
  const key = owner && draftKey(owner);
  useKeptDraft(key, dispatch);

  async function attach(
    pick: () => Promise<PickedAttachment[]>,
  ): Promise<void> {
    try {
      dispatch({ type: 'picked', picked: await pick() });
    } catch {
      dispatch({ type: 'pickFailed' });
    }
  }

  // Uploads the draft's attachments at once, in draft order; undefined when any upload fails.
  async function uploadDraftAsPrompt(
    sent: ComposerDraft,
  ): Promise<SessionNewInput['prompt'] | undefined> {
    attachmentUpload.reset();
    const uploads = toUploadForms(sent, state.files);
    const blobs = uploads.length
      ? await attachmentUpload
          .mutateAsync(uploads.map(({ form }) => form))
          .catch((): undefined => {})
      : [];
    return (
      blobs &&
      draftPrompt(
        sent.text,
        uploads.flatMap(({ name }, index) => {
          const blob = blobs[index];
          return blob ? [{ name, blob }] : [];
        }),
      )
    );
  }

  return {
    draft: state.draft,
    changeDraft: (draft) => {
      dispatch({ type: 'changed', draft });
      if (key) keptDrafts.keep(key, draft.text);
    },
    attachImages: () => attach(pickImages),
    attachFiles: () => attach(pickFiles),
    attachDroppedFiles: async ({ files, folders }) => {
      if (files.length > 0) await attach(() => droppedFiles(files));
      if (folders > 0) dispatch({ type: 'folderDropped' });
    },
    uploadDraftAsPrompt,
    clearDraft: () => {
      dispatch({ type: 'cleared' });
      if (key) keptDrafts.keep(key, '');
    },
    uploading: attachmentUpload.isPending,
    attachmentError: toAttachmentError(
      state.selectionError,
      attachmentUpload.error,
    ),
  };
}
