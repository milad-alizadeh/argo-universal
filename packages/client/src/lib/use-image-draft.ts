import type { BlobRef, SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { ComposerDraft } from '#components/Composer';
import { useTRPC } from '../trpc/context';
import { pickImages } from './pick-images';

const emptyDraft: ComposerDraft = { text: '', images: [] };

// A Composer draft with attached images, and the prompt it sends once its images are uploaded.
export function useImageDraft() {
  const trpc = useTRPC();
  const [draft, setDraft] = useState(emptyDraft);
  // The file behind each attached image, by its id in the draft.
  const imageFiles = useRef(new Map<string, Blob>());
  const upload = useMutation(trpc.blob.upload.mutationOptions());

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
    const kept = new Set(next.images.map((image) => image.id));
    for (const id of imageFiles.current.keys())
      if (!kept.has(id)) imageFiles.current.delete(id);
    setDraft(next);
  }

  // Uploads each image, in draft order; undefined once an upload fails, which `upload.error` shows.
  async function uploadImages(
    sent: ComposerDraft,
  ): Promise<BlobRef[] | undefined> {
    const references: BlobRef[] = [];
    for (const image of sent.images) {
      const file = imageFiles.current.get(image.id);
      if (!file) throw new Error(`No file for the attached ${image.name}`);
      const form = new FormData();
      form.append('file', file, image.name);
      const reference = await upload.mutateAsync(form).catch(() => undefined);
      if (!reference) return undefined;
      references.push(reference);
    }
    return references;
  }

  // The draft as prompt blocks: its text, then each uploaded image.
  async function toPrompt(
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
    toPrompt,
    clear: () => changeDraft(emptyDraft),
    upload,
  };
}
