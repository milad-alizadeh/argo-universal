import { describe, expect, it } from 'vitest';
import {
  image,
  picked,
  withText,
} from '../../../../mocks/composer-attachment-draft-mock';
import {
  attachmentDraftReducer,
  attachmentSelectionFailureMessage,
} from './attachment-draft';
import { toAttachmentError, toUploadForms } from './attachment-upload';

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
      key: 'first-selection',
      upload: new Error('Server is down'),
      expected: {
        kind: 'selection',
        message: attachmentSelectionFailureMessage,
        key: 'first-selection',
      },
    },
    {
      case: 'an upload failure with its reason',
      selection: undefined,
      key: undefined,
      upload: new Error('Server is down'),
      expected: {
        kind: 'upload',
        message: "Couldn't upload the attachment. Server is down",
      },
    },
    {
      case: 'nothing without a failure',
      selection: undefined,
      key: undefined,
      upload: null,
      expected: undefined,
    },
  ])('reports $case', ({ selection, upload, key, expected }) => {
    expect(toAttachmentError(selection, upload, key)).toEqual(expected);
  });
});
