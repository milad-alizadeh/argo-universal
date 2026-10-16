import {
  type BlobRef,
  blobPath,
  isPromptImage,
  type SessionNewInput,
} from '@repo/contracts';

export interface UploadedAttachment {
  name: string;
  blob: BlobRef;
}

type PromptBlock = SessionNewInput['prompt'][number];

const attachmentBlock = ({ name, blob }: UploadedAttachment): PromptBlock =>
  isPromptImage(blob.mime)
    ? { type: 'image', mimeType: blob.mime, blob }
    : {
        type: 'resource_link',
        name,
        uri: blobPath(blob.blobId),
        mimeType: blob.mime,
        size: blob.bytes,
        blob,
      };

// A sent draft as prompt blocks: its text unless blank, then each uploaded attachment in draft order.
export function draftPrompt(
  text: string,
  uploads: readonly UploadedAttachment[],
): SessionNewInput['prompt'] {
  return [
    ...(text.trim() ? [{ type: 'text' as const, text }] : []),
    ...uploads.map(attachmentBlock),
  ];
}
