import type { BlobRef, SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { ComposerDraft } from '#components/Composer';
import { useTRPCClient } from '../trpc/context';
import { pickImages } from './pick-images';

const emptyDraft: ComposerDraft = { text: '', images: [] };

// A Composer draft with attached images, and the prompt it sends once its images are uploaded.
export function useImageDraft() {
  const client = useTRPCClient();
  const [draft, setDraft] = useState(emptyDraft);
  // The file behind each attached image, by its id in the draft.
  const imageFiles = useRef(new Map<string, Blob>());
  // All of a draft's images upload together, as one mutation, so `imageUpload` reports them as one.
  const imageUpload = useMutation({
    mutationFn: (forms: FormData[]) =>
      Promise.all(forms.map((form) => client.blob.upload.mutate(form))),
  });

  async function attachImages() {
    const picked = await pickImages();
    for (const { image, file } of picked)
      imageFiles.current.set(image.id, file);
    setDraft((current) => ({
      ...current,
      images: [...current.images, ...picked.map(({ image }) => image)],
    }));
  }

  // Keeps a file only while its image is in the draft.
  function changeDraft(next: ComposerDraft) {
    const keptImageIds = new Set(next.images.map((image) => image.id));
    for (const id of imageFiles.current.keys())
      if (!keptImageIds.has(id)) imageFiles.current.delete(id);
    setDraft(next);
  }

  // Uploads the images at once, in draft order; undefined when any upload fails, which `imageUpload.error` shows.
  function uploadImages(sent: ComposerDraft): Promise<BlobRef[] | undefined> {
    const forms = sent.images.map((image) => {
      const file = imageFiles.current.get(image.id);
      if (!file) throw new Error(`No file for the attached ${image.name}`);
      const form = new FormData();
      form.append('file', file, image.name);
      return form;
    });
    if (!forms.length) return Promise.resolve([]);
    return imageUpload.mutateAsync(forms).catch(() => undefined);
  }

  // The draft as prompt blocks: its text, then each uploaded image.
  async function uploadDraftAsPrompt(
    sent: ComposerDraft,
  ): Promise<SessionNewInput['prompt'] | undefined> {
    const images = await uploadImages(sent);
    if (!images) return undefined;
    return [
      ...(sent.text.trim() ? [{ type: 'text' as const, text: sent.text }] : []),
      ...images.map((blob) => ({
        type: 'image' as const,
        mimeType: blob.mime,
        blob,
      })),
    ];
  }

  return {
    draft,
    changeDraft,
    attachImages,
    uploadDraftAsPrompt,
    clearDraft: () => changeDraft(emptyDraft),
    imageUpload,
  };
}
