import type { BlobRef, SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { type Dispatch, useEffect, useReducer } from 'react';
import { useTRPC } from '#features/connection';
import type { ComposerDraft } from '../components/composer/composer';
import { type DraftOwner, draftKey } from '../state/draft-key';
import { draftPrompt } from '../state/draft-prompt';
import {
  type AttachmentError,
  emptyImageDraft,
  type ImageDraftEvent,
  imageDraftReducer,
  toAttachmentError,
  toUploadForms,
} from '../state/image-draft';
import { keepDraft, loadKeptDraft } from '../state/kept-draft';
import { pickImages } from './pick-images';

export interface ImageDraft {
  draft: ComposerDraft;
  changeDraft: (next: ComposerDraft) => void;
  attachImages: () => Promise<void>;
  uploadDraftAsPrompt: (
    sent: ComposerDraft,
  ) => Promise<SessionNewInput['prompt'] | undefined>;
  clearDraft: () => void;
  uploading: boolean;
  attachmentError: AttachmentError;
}

function useImageUpload(): ReturnType<
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
  key: string | undefined,
  dispatch: Dispatch<ImageDraftEvent>,
): void {
  useEffect(() => {
    if (!key) return;
    dispatch({ type: 'ownerChanged', key });
    void loadKeptDraft(key).then((text) => {
      dispatch({ type: 'restored', key, text });
    });
  }, [key, dispatch]);
}

// A Composer draft with attached images, and the prompt it sends once its images are uploaded. This Device keeps its text, not its images, per owner.
export function useImageDraft(owner: DraftOwner | undefined): ImageDraft {
  const [state, dispatch] = useReducer(imageDraftReducer, emptyImageDraft);
  const imageUpload = useImageUpload();
  const key = owner && draftKey(owner);
  useKeptDraft(key, dispatch);

  async function attachImages(): Promise<void> {
    try {
      dispatch({ type: 'picked', picked: await pickImages() });
    } catch {
      dispatch({ type: 'pickFailed' });
    }
  }

  // Uploads the draft's images at once, in draft order; undefined when any upload fails.
  async function uploadDraftAsPrompt(
    sent: ComposerDraft,
  ): Promise<SessionNewInput['prompt'] | undefined> {
    imageUpload.reset();
    const forms = toUploadForms(sent, state.files);
    const images = forms.length
      ? await imageUpload.mutateAsync(forms).catch((): undefined => {})
      : [];
    return images && draftPrompt(sent.text, images);
  }

  return {
    draft: state.draft,
    changeDraft: (draft) => {
      dispatch({ type: 'changed', draft });
      if (key) keepDraft(key, draft.text);
    },
    attachImages,
    uploadDraftAsPrompt,
    clearDraft: () => {
      dispatch({ type: 'cleared' });
      if (key) keepDraft(key, '');
    },
    uploading: imageUpload.isPending,
    attachmentError: toAttachmentError(state.selectionError, imageUpload.error),
  };
}
