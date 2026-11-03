import { describe, expect, it } from 'vitest';
import {
  firstProject,
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

describe('a sent draft forgotten while a Composer is open', () => {
  const sent = { text: keptText, attachments: [image('first')] };

  const file = new Blob(['first']);

  const owned = attachmentDraftReducer(emptyAttachmentDraft, {
    type: 'ownerChanged',
    key: secondProject,
    kept: { attachments: sent.attachments, files: new Map([['first', file]]) },
  });

  const holding = attachmentDraftReducer(owned, {
    type: 'restored',
    key: secondProject,
    text: keptText,
  });

  const forgotten = {
    type: 'sentForgotten',
    key: secondProject,
    sent,
  } as const;

  const empty = { text: '', attachments: [] };

  it('empties a draft still as it was sent, with its files', () => {
    const next = attachmentDraftReducer(holding, forgotten);

    expect(next.draft).toEqual(empty);
    expect(next.files.size).toBe(0);
    expect(next.ownerKey).toBe(secondProject);
  });

  it.each([
    { edit: 'different text', draft: { ...sent, text: 'Ship on Monday' } },
    { edit: 'its text removed', draft: { ...sent, text: '' } },
    { edit: 'its Attachments removed', draft: { ...sent, attachments: [] } },
    {
      edit: 'another Attachment',
      draft: { ...sent, attachments: [image('first'), image('second')] },
    },
  ])('keeps a draft with $edit', ({ draft }) => {
    const edited = attachmentDraftReducer(holding, { type: 'changed', draft });

    expect(attachmentDraftReducer(edited, forgotten).draft).toEqual(draft);
  });

  it('keeps the draft of another owner', () => {
    const other = { ...forgotten, key: firstProject };

    expect(attachmentDraftReducer(holding, other).draft).toEqual(sent);
  });

  it('does not let the kept text arrive once it is forgotten', () => {
    const emptied = attachmentDraftReducer(owned, forgotten);

    const next = attachmentDraftReducer(emptied, {
      type: 'restored',
      key: secondProject,
      text: keptText,
    });

    expect(next.draft).toEqual(empty);
  });
});
