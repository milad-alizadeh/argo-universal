import type { ComposerAttachment } from '../src/features/composer/components/composer/composer';
import {
  attachmentDraftReducer,
  emptyAttachmentDraft,
  type PickedAttachment,
} from '../src/features/composer/state/attachment-draft';
import { draftKey } from '../src/features/composer/state/draft-key';

export const image = (id: string): ComposerAttachment => ({
  id,
  name: `${id}.png`,
  uri: `file:///${id}.png`,
  bytes: 4,
  mimeType: 'image/png',
});

export const picked = (id: string): PickedAttachment => ({
  attachment: image(id),
  file: new Blob([id], { type: 'image/png' }),
});

export const keptText = 'Kept on this Device';

export const firstProject = draftKey({
  type: 'new-session',
  projectId: 'project-1',
});

export const secondProject = draftKey({
  type: 'new-session',
  projectId: 'project-2',
});

export const draftText = 'Look at this';

export const withText = attachmentDraftReducer(emptyAttachmentDraft, {
  type: 'changed',
  draft: { text: draftText, attachments: [] },
});
