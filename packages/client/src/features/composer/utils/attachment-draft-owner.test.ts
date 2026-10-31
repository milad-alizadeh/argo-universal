import { describe, expect, it } from 'vitest';
import {
  picked,
  keptText,
  firstProject,
  secondProject,
  withText,
} from '../../../../mocks/composer-attachment-draft-mock';
import { noKeptAttachments } from '../stores/kept-attachments';
import {
  emptyAttachmentDraft,
  attachmentDraftReducer,
} from './attachment-draft';

describe('attachmentDraftReducer', () => {
  it('empties the text and the attachments when the draft changes owner', () => {
    const attached = attachmentDraftReducer(withText, {
      type: 'picked',
      picked: [picked('first')],
    });

    const failed = attachmentDraftReducer(attached, {
      type: 'pickFailed',
      key: 'prior-owner-failure',
    });

    const next = attachmentDraftReducer(failed, {
      type: 'ownerChanged',
      key: secondProject,
      kept: noKeptAttachments,
    });

    expect(next.draft).toEqual({ text: '', attachments: [] });
    expect(next.files.size).toBe(0);
    expect(next.selectionError).toBeUndefined();
    expect(next.selectionErrorKey).toBeUndefined();
  });

  it('keeps what was typed when the kept text arrives after it', () => {
    const owned = attachmentDraftReducer(emptyAttachmentDraft, {
      type: 'ownerChanged',
      key: secondProject,
      kept: noKeptAttachments,
    });

    const typed = attachmentDraftReducer(owned, {
      type: 'changed',
      draft: { text: 'Typed first', attachments: [] },
    });

    const next = attachmentDraftReducer(typed, {
      type: 'restored',
      key: secondProject,
      text: keptText,
    });

    expect(next.draft.text).toBe('Typed first');
  });

  it("restores the kept text of the draft's owner", () => {
    const owned = attachmentDraftReducer(withText, {
      type: 'ownerChanged',
      key: secondProject,
      kept: noKeptAttachments,
    });

    const next = attachmentDraftReducer(owned, {
      type: 'restored',
      key: secondProject,
      text: keptText,
    });

    expect(next.draft.text).toBe(keptText);
  });

  it('ignores kept text that arrives for an earlier owner', () => {
    const first = attachmentDraftReducer(emptyAttachmentDraft, {
      type: 'ownerChanged',
      key: firstProject,
      kept: noKeptAttachments,
    });

    const second = attachmentDraftReducer(first, {
      type: 'ownerChanged',
      key: secondProject,
      kept: noKeptAttachments,
    });

    const next = attachmentDraftReducer(second, {
      type: 'restored',
      key: firstProject,
      text: 'Kept for the first Project',
    });

    expect(next.draft.text).toBe('');
  });

  it('empties the draft and its error once the prompt is sent', () => {
    const failed = attachmentDraftReducer(withText, {
      type: 'pickFailed',
      key: 'pick-attempt',
    });

    expect(attachmentDraftReducer(failed, { type: 'cleared' })).toEqual(
      emptyAttachmentDraft,
    );
  });
});

// Every Session's draft starts from emptyAttachmentDraft, so isolation holds only while the reducer never changes the state it is given.
describe('two drafts from the same start', () => {
  it('keep their own text, attachments and files, and clearing one leaves the other', () => {
    const first = attachmentDraftReducer(
      attachmentDraftReducer(emptyAttachmentDraft, {
        type: 'changed',
        draft: { text: 'Draft on this device.', attachments: [] },
      }),
      { type: 'picked', picked: [picked('first')] },
    );

    const second = attachmentDraftReducer(emptyAttachmentDraft, {
      type: 'changed',
      draft: { text: 'A different draft.', attachments: [] },
    });

    const afterFirstSent = attachmentDraftReducer(first, { type: 'cleared' });

    expect(afterFirstSent).toEqual(emptyAttachmentDraft);
    expect(second.draft).toEqual({
      text: 'A different draft.',
      attachments: [],
    });
    expect(second.files.size).toBe(0);
    expect(emptyAttachmentDraft.draft).toEqual({ text: '', attachments: [] });
    expect(emptyAttachmentDraft.files.size).toBe(0);
  });
});
