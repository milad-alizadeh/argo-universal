import { describe, expect, it } from 'vitest';
import type { ComposerImage } from '../components/composer';
import {
  emptyImageDraft,
  imageDraftReducer,
  imageSelectionFailureMessage,
  toAttachmentError,
  toUploadForms,
} from './image-draft';

const image = (id: string): ComposerImage => ({
  id,
  name: `${id}.png`,
  uri: `file:///${id}.png`,
  bytes: 4,
});
const picked = (id: string): { image: ComposerImage; file: Blob } => ({
  image: image(id),
  file: new Blob([id], { type: 'image/png' }),
});

const draftText = 'Look at this';

const withText = imageDraftReducer(emptyImageDraft, {
  type: 'changed',
  draft: { text: draftText, images: [] },
});

describe('imageDraftReducer', () => {
  it('appends picked images to the draft', () => {
    const next = imageDraftReducer(withText, {
      type: 'picked',
      picked: [picked('first'), picked('second')],
    });
    expect(next.draft).toEqual({
      text: draftText,
      images: [image('first'), image('second')],
    });
  });

  it('keeps the draft and shows the selection error when a pick fails', () => {
    const next = imageDraftReducer(withText, { type: 'pickFailed' });
    expect(next).toMatchObject({
      draft: withText.draft,
      selectionError: imageSelectionFailureMessage,
    });
  });

  it('clears the selection error when a later pick succeeds', () => {
    const failed = imageDraftReducer(withText, { type: 'pickFailed' });
    const next = imageDraftReducer(failed, {
      type: 'picked',
      picked: [picked('first')],
    });
    expect(next.selectionError).toBeUndefined();
  });

  it('forgets the file of an image removed from the draft', () => {
    const attached = imageDraftReducer(withText, {
      type: 'picked',
      picked: [picked('first'), picked('second')],
    });
    const next = imageDraftReducer(attached, {
      type: 'changed',
      draft: { text: draftText, images: [image('second')] },
    });
    expect([...next.files.keys()]).toEqual(['second']);
  });

  it('empties the draft and its error once the prompt is sent', () => {
    const failed = imageDraftReducer(withText, { type: 'pickFailed' });
    expect(imageDraftReducer(failed, { type: 'cleared' })).toEqual(
      emptyImageDraft,
    );
  });
});

// Every Session's draft starts from emptyImageDraft, so isolation holds only while the reducer never changes the state it is given.
describe('two drafts from the same start', () => {
  it('keep their own text, images and files, and clearing one leaves the other', () => {
    const first = imageDraftReducer(
      imageDraftReducer(emptyImageDraft, {
        type: 'changed',
        draft: { text: 'Draft on this device.', images: [] },
      }),
      { type: 'picked', picked: [picked('first')] },
    );
    const second = imageDraftReducer(emptyImageDraft, {
      type: 'changed',
      draft: { text: 'A different draft.', images: [] },
    });

    const afterFirstSent = imageDraftReducer(first, { type: 'cleared' });

    expect(afterFirstSent).toEqual(emptyImageDraft);
    expect(second.draft).toEqual({ text: 'A different draft.', images: [] });
    expect(second.files.size).toBe(0);
    expect(emptyImageDraft.draft).toEqual({ text: '', images: [] });
    expect(emptyImageDraft.files.size).toBe(0);
  });
});

describe('toUploadForms', () => {
  it('names each upload after its image, in draft order', () => {
    const attached = imageDraftReducer(withText, {
      type: 'picked',
      picked: [picked('first'), picked('second')],
    });
    const forms = toUploadForms(
      { text: '', images: [image('second'), image('first')] },
      attached.files,
    );
    expect(
      forms.map((form) => {
        const file = form.get('file');
        return file instanceof File ? file.name : undefined;
      }),
    ).toEqual(['second.png', 'first.png']);
  });

  it('refuses an image whose file is not held', () => {
    expect(() =>
      toUploadForms({ text: '', images: [image('lost')] }, new Map()),
    ).toThrow('No file for the attached lost.png');
  });
});

describe('toAttachmentError', () => {
  it.each([
    {
      case: 'a selection failure over an upload failure',
      selection: imageSelectionFailureMessage,
      upload: new Error('Server is down'),
      expected: { kind: 'selection', message: imageSelectionFailureMessage },
    },
    {
      case: 'an upload failure with its reason',
      selection: undefined,
      upload: new Error('Server is down'),
      expected: {
        kind: 'upload',
        message: "Couldn't upload the image. Server is down",
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
