import {
  type BlobRef,
  blobPath,
  isPromptImage,
  type SessionNewInput,
} from '@repo/contracts';

// A chosen suggestion's link, sent beside its text as an Issue reference's is (ADR-0023).
export type PromptResource = Extract<
  SessionNewInput['prompt'][number],
  { type: 'resource_link' }
>;

export interface UploadedAttachment {
  name: string;
  blob: BlobRef;
}

type PromptBlock = SessionNewInput['prompt'][number];

const attachmentBlock = ({ name, blob }: UploadedAttachment): PromptBlock =>
  isPromptImage(blob.mime)
    ? { type: 'image', name, mimeType: blob.mime, blob }
    : {
        type: 'resource_link',
        name,
        uri: blobPath(blob.blobId),
        mimeType: blob.mime,
        size: blob.bytes,
        blob,
      };

// A sent draft as prompt blocks: its text unless blank, its chosen resources, then each uploaded attachment in draft order.
export function draftPrompt(
  text: string,
  uploads: readonly UploadedAttachment[],
  resources: readonly PromptResource[] = [],
): SessionNewInput['prompt'] {
  return [
    ...(text.trim() ? [{ type: 'text' as const, text }] : []),
    ...resources,
    ...uploads.map(attachmentBlock),
  ];
}

// Each upload paired with the Blob stored for it, in draft order.
export function uploadedAttachments(
  uploads: readonly { name: string }[],
  blobs: readonly BlobRef[],
): UploadedAttachment[] {
  return uploads.flatMap(({ name }, index) => {
    const blob = blobs[index];

    return blob ? [{ name, blob }] : [];
  });
}
