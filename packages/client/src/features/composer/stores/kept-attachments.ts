import type { ComposerAttachment } from '../components/composer/composer';
import type { DraftKey } from '../utils/draft-key';

export interface KeptAttachmentsOfDraft {
  attachments: ComposerAttachment[];
  // The file behind each Attachment, by its id.
  files: ReadonlyMap<string, Blob>;
}

export interface KeptAttachments {
  load: (key: DraftKey) => KeptAttachmentsOfDraft;
  keep: (
    key: DraftKey,
    attachments: ComposerAttachment[],
    files: ReadonlyMap<string, Blob>,
  ) => void;
}

export const noKeptAttachments: KeptAttachmentsOfDraft = {
  attachments: [],
  files: new Map(),
};

// Attachments kept in memory for as long as the App runs: a file is a Blob, which this Device's text storage cannot hold.
export function keptAttachmentsInMemory(): KeptAttachments {
  const kept = new Map<DraftKey, KeptAttachmentsOfDraft>();

  const load = (key: DraftKey): KeptAttachmentsOfDraft =>
    kept.get(key) ?? noKeptAttachments;

  const keep: KeptAttachments['keep'] = (key, attachments, files) => {
    if (attachments.length === 0) kept.delete(key);
    else kept.set(key, { attachments, files });
  };

  return { load, keep };
}

export const keptAttachments = keptAttachmentsInMemory();
