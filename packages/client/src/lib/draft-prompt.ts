import type { BlobRef, SessionNewInput } from '@repo/contracts';

// A sent draft as prompt blocks: its text unless blank, then each uploaded image in draft order.
export function draftPrompt(
  text: string,
  images: readonly BlobRef[],
): SessionNewInput['prompt'] {
  return [
    ...(text.trim() ? [{ type: 'text' as const, text }] : []),
    ...images.map((blob) => ({
      type: 'image' as const,
      mimeType: blob.mime,
      blob,
    })),
  ];
}
