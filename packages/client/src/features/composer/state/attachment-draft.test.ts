import { describe, expect, it } from 'vitest';
import {
  image,
  picked,
  draftText,
  withText,
} from '../../../../mocks/composer-attachment-draft-mock';
import {
  attachmentDraftReducer,
  attachmentSelectionFailureMessage,
  folderRefusedMessage,
} from './attachment-draft';

const firstAttempt = 'first-attempt';

describe('attachmentDraftReducer', () => {
  it.each([
    { type: 'pickFailed', message: attachmentSelectionFailureMessage },
    { type: 'folderDropped', message: folderRefusedMessage },
  ] as const)(
    'identifies each repeated $type without treating draft edits as failures',
    ({ type, message }) => {
      const first = attachmentDraftReducer(withText, {
        type,
        key: firstAttempt,
      });

      const edited = attachmentDraftReducer(first, {
        type: 'changed',
        draft: { ...first.draft, text: 'Keep editing.' },
      });

      const second = attachmentDraftReducer(edited, {
        type,
        key: 'second-attempt',
      });

      expect(first).toMatchObject({
        selectionError: message,
        selectionErrorKey: firstAttempt,
      });
      expect(edited.selectionErrorKey).toBe(firstAttempt);
      expect(second).toMatchObject({
        selectionError: message,
        selectionErrorKey: 'second-attempt',
        draft: edited.draft,
      });
    },
  );

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
    const next = attachmentDraftReducer(withText, {
      type: 'pickFailed',
      key: 'pick-attempt',
    });

    expect(next).toMatchObject({
      draft: withText.draft,
      selectionError: attachmentSelectionFailureMessage,
    });
  });

  it('refuses a dropped folder with a message and keeps the draft', () => {
    const next = attachmentDraftReducer(withText, {
      type: 'folderDropped',
      key: 'drop-attempt',
    });

    expect(next).toMatchObject({
      draft: withText.draft,
      selectionError: folderRefusedMessage,
    });
  });

  it('clears the selection error when a later pick succeeds', () => {
    const failed = attachmentDraftReducer(withText, {
      type: 'pickFailed',
      key: 'pick-attempt',
    });

    const next = attachmentDraftReducer(failed, {
      type: 'picked',
      picked: [picked('first')],
    });

    expect(next.selectionError).toBeUndefined();
    expect(next.selectionErrorKey).toBeUndefined();
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
});
