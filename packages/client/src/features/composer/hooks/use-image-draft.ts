import type { BlobRef, SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useReducer } from 'react';
import { useTRPC } from '#features/connection';
import type { ComposerDraft } from '../components/composer';
import { draftPrompt } from '../state/draft-prompt';
import {
  type AttachmentError,
  emptyImageDraft,
  imageDraftReducer,
  toAttachmentError,
  toUploadForms,
} from '../state/image-draft';
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

// A Composer draft with attached images, and the prompt it sends once its images are uploaded.
export function useImageDraft(): ImageDraft {
  const [state, dispatch] = useReducer(imageDraftReducer, emptyImageDraft);
  const imageUpload = useImageUpload();

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
    changeDraft: (draft) => dispatch({ type: 'changed', draft }),
    attachImages,
    uploadDraftAsPrompt,
    clearDraft: () => dispatch({ type: 'cleared' }),
    uploading: imageUpload.isPending,
    attachmentError: toAttachmentError(state.selectionError, imageUpload.error),
  };
}
