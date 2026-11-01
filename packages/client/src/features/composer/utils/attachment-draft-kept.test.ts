import { describe, expect, it } from 'vitest';
import {
  image,
  keptText,
  secondProject,
  withText,
} from '../../../../mocks/composer-attachment-draft-mock';
import { noKeptAttachments } from '../stores/kept-attachments';
import {
  attachmentDraftReducer,
  emptyAttachmentDraft,
} from './attachment-draft';

describe('a draft changing owner', () => {
  it('brings back the Attachments kept for the new owner, with their files', () => {
    const file = new Blob(['first']);

    const next = attachmentDraftReducer(withText, {
      type: 'ownerChanged',
      key: secondProject,
      kept: {
        attachments: [image('first')],
        files: new Map([['first', file]]),
      },
    });

    expect(next.draft).toEqual({ text: '', attachments: [image('first')] });
    expect(next.files.get('first')).toBe(file);
  });

  it('keeps the kept Attachments when the kept text arrives', () => {
    const owned = attachmentDraftReducer(emptyAttachmentDraft, {
      type: 'ownerChanged',
      key: secondProject,
      kept: { attachments: [image('first')], files: new Map() },
    });

    const next = attachmentDraftReducer(owned, {
      type: 'restored',
      key: secondProject,
      text: keptText,
    });

    expect(next.draft).toEqual({
      text: keptText,
      attachments: [image('first')],
    });
  });

  it('still knows its owner once the prompt is sent', () => {
    const owned = attachmentDraftReducer(emptyAttachmentDraft, {
      type: 'ownerChanged',
      key: secondProject,
      kept: noKeptAttachments,
    });

    expect(attachmentDraftReducer(owned, { type: 'cleared' }).ownerKey).toBe(
      secondProject,
    );
  });
});
