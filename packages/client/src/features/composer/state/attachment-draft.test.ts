import { describe, expect, it } from 'vitest';
import type { ComposerAttachment } from '../components/composer/composer';
import {
  emptyAttachmentDraft,
  attachmentDraftReducer,
  attachmentSelectionFailureMessage,
  folderRefusedMessage,
  toAttachmentError,
  type PickedAttachment,
  toUploadForms,
} from './attachment-draft';

const image = (id: string): ComposerAttachment => ({
  id,
  name: `${id}.png`,
  uri: `file:///${id}.png`,
  bytes: 4,
  mimeType: 'image/png',
});
const picked = (id: string): PickedAttachment => ({
  attachment: image(id),
  file: new Blob([id], { type: 'image/png' }),
});

const draftText = 'Look at this';

const withText = attachmentDraftReducer(emptyAttachmentDraft, {
  type: 'changed',
  draft: { text: draftText, attachments: [] },
});

describe('attachmentDraftReducer', () => {
  it('appends picked attachments to the draft', () => {
    const next = attachmentDraftReducer(withText, {
      type: 'picked',
      picked: [picked('first'), picked('second')],
    });
    expect(next.draft).toEqual({
      text: draftText,
      attachments: [image('first'), image('second')],
    });
  });

  it('keeps the draft and shows the selection error when a pick fails', () => {
    const next = attachmentDraftReducer(withText, { type: 'pickFailed' });
    expect(next).toMatchObject({
      draft: withText.draft,
      selectionError: attachmentSelectionFailureMessage,
    });
  });

  it('refuses a dropped folder with a message and keeps the draft', () => {
    const next = attachmentDraftReducer(withText, { type: 'folderDropped' });
    expect(next).toMatchObject({
      draft: withText.draft,
      selectionError: folderRefusedMessage,
    });
  });

  it('clears the selection error when a later pick succeeds', () => {
    const failed = attachmentDraftReducer(withText, { type: 'pickFailed' });
    const next = attachmentDraftReducer(failed, {
      type: 'picked',
      picked: [picked('first')],
    });
    expect(next.selectionError).toBeUndefined();
  });

  it('forgets the file of an attachment removed from the draft', () => {
    const attached = attachmentDraftReducer(withText, {
      type: 'picked',
      picked: [picked('first'), picked('second')],
    });
    const next = attachmentDraftReducer(attached, {
      type: 'changed',
      draft: { text: draftText, attachments: [image('second')] },
    });
    expect([...next.files.keys()]).toEqual(['second']);
  });

  it('empties the draft and its error once the prompt is sent', () => {
    const failed = attachmentDraftReducer(withText, { type: 'pickFailed' });
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

describe('toUploadForms', () => {
  it('names each upload after its attachment, in draft order', () => {
    const attached = attachmentDraftReducer(withText, {
      type: 'picked',
      picked: [picked('first'), picked('second')],
    });
    const forms = toUploadForms(
      { text: '', attachments: [image('second'), image('first')] },
      attached.files,
    );
    expect(
      forms.map(({ name, form }) => {
        const file = form.get('file');
        return [name, file instanceof File ? file.name : undefined];
      }),
    ).toEqual([
      ['second.png', 'second.png'],
      ['first.png', 'first.png'],
    ]);
  });

  it('refuses an attachment whose file is not held', () => {
    expect(() =>
      toUploadForms({ text: '', attachments: [image('lost')] }, new Map()),
    ).toThrow('No file for the attached lost.png');
  });
});

describe('toAttachmentError', () => {
  it.each([
    {
      case: 'a selection failure over an upload failure',
      selection: attachmentSelectionFailureMessage,
      upload: new Error('Server is down'),
      expected: {
        kind: 'selection',
        message: attachmentSelectionFailureMessage,
      },
    },
    {
      case: 'an upload failure with its reason',
      selection: undefined,
      upload: new Error('Server is down'),
      expected: {
        kind: 'upload',
        message: "Couldn't upload the attachment. Server is down",
      },
    },
    {
      case: 'nothing without a failure',
      selection: undefined,
      upload: null,
      expected: undefined,
    },
  ])('reports $case', ({ selection, upload, expected }) => {
    expect(toAttachmentError(selection, upload)).toEqual(expected);
  });
});
