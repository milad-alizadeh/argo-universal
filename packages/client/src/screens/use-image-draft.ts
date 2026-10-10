import type { BlobRef, SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { ComposerDraft } from '../components/composer';
import { useTRPC } from '../trpc/context';
import { draftPrompt } from './draft-prompt';
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
  attachmentError:
    | { kind: 'selection' | 'upload'; message: string }
    | undefined;
  clearUploadError: () => void;
}

export const imageSelectionFailureMessage =
  "Couldn't select images. Try again.";

const emptyDraft: ComposerDraft = { text: '', images: [] };

// A Composer draft with attached images, and the prompt it sends once its images are uploaded.
export function useImageDraft(): ImageDraft {
  const [draft, setDraft] = useState(emptyDraft);
  const [imageSelectionError, setImageSelectionError] = useState<string>();
  // The file behind each attached image, by its id in the draft.
  const imageFiles = useRef(new Map<string, Blob>());
  const upload = useTRPC().blob.upload.mutationOptions().mutationFn;
  const imageUpload = useMutation({
    mutationFn: (forms: FormData[], context) => {
      if (!upload) throw new Error('Blob upload mutation function is missing');
      return Promise.all(forms.map((form) => upload(form, context)));
    },
  });

  async function attachImages(): Promise<void> {
    try {
      const picked = await pickImages();
      setImageSelectionError(undefined);
      for (const { image, file } of picked)
        imageFiles.current.set(image.id, file);
      setDraft((current) => ({
        ...current,
        images: [...current.images, ...picked.map(({ image }) => image)],
      }));
    } catch {
      setImageSelectionError(imageSelectionFailureMessage);
    }
  }

  // Keeps a file only while its image is in the draft.
  function changeDraft(next: ComposerDraft): void {
    const keptImageIds = new Set(next.images.map((image) => image.id));
    for (const id of imageFiles.current.keys())
      if (!keptImageIds.has(id)) imageFiles.current.delete(id);
    setDraft(next);
  }

  // Uploads the images at once, in draft order; undefined when any upload fails.
  function uploadImages(sent: ComposerDraft): Promise<BlobRef[] | undefined> {
    const forms = sent.images.map((image) => {
      const file = imageFiles.current.get(image.id);
      if (!file) throw new Error(`No file for the attached ${image.name}`);
      const form = new FormData();
      form.append('file', file, image.name);
      return form;
    });
    if (!forms.length) return Promise.resolve([]);
    return imageUpload.mutateAsync(forms).catch((): undefined => {});
  }

  // Uploads the draft's images; undefined when any upload fails.
  async function uploadDraftAsPrompt(
    sent: ComposerDraft,
  ): Promise<SessionNewInput['prompt'] | undefined> {
    imageUpload.reset();
    const images = await uploadImages(sent);
    return images && draftPrompt(sent.text, images);
  }

  return {
    draft,
    changeDraft,
    attachImages,
    uploadDraftAsPrompt,
    clearDraft: () => {
      changeDraft(emptyDraft);
      setImageSelectionError(undefined);
    },
    uploading: imageUpload.isPending,
    attachmentError: toAttachmentError(imageSelectionError, imageUpload.error),
    clearUploadError: imageUpload.reset,
  };
}

function toAttachmentError(
  selection: string | undefined,
  upload: Error | null,
): ImageDraft['attachmentError'] {
  if (selection) return { kind: 'selection', message: selection };
  if (upload)
    return {
      kind: 'upload',
      message: `Couldn't upload the image. ${upload.message}`,
    };
  return undefined;
}
