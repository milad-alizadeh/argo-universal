import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import { shownText } from '@repo/kit/mocks/shown-text';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { dismissToasts } from '@repo/kit/primitives/overlays/toast';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import {
  composerProps,
  oversizedComposerImage,
} from '../../../../../mocks/composer-mock';
import {
  imageComposer,
  meta as composerTestMeta,
  type Story,
} from '../../../../../mocks/composer/composer-story-context.test.mocks';
import {
  attachmentDraftReducer,
  attachmentSelectionFailureMessage,
  emptyAttachmentDraft,
} from '../../utils/attachment-draft';
import { toAttachmentError } from '../../utils/attachment-upload';

const keptText = 'Keep editing.';

const selectionFailed = 'The selection failed.';

const oversizedMessage = 'Attachment exceeds 20 MB.';

const meta = { ...composerTestMeta, title: 'Tests/Composer/ErrorOccurrences' };

export default meta;

export const RepeatedFailuresToastWithoutRepeatingOnDraftEdits: Story = {
  render: () => <View testID="controlled-errors" />,
  play: async ({ canvas }) => {
    await settleLayout('phone');
    const root = createRoot(canvas.getByTestId('controlled-errors'));

    const props = composerProps({
      ...meta.args,
      onDraftChange: fn(),
      onAttachImages: fn(),
      onSend: fn(),
    });

    let state = attachmentDraftReducer(emptyAttachmentDraft, {
      type: 'pickFailed',
      key: 'first-pick',
    });

    const render = (): void => {
      const error = toAttachmentError(
        state.selectionError,
        null,
        state.selectionErrorKey,
      );

      root.render(
        imageComposer({
          ...props,
          draft: state.draft,
          error: error?.message,
          errorKey: error?.key,
        }),
      );
    };

    try {
      render();
      await findToast(attachmentSelectionFailureMessage);
      dismissToasts();
      await waitFor(async () =>
        expect(await allToasts(attachmentSelectionFailureMessage)).toHaveLength(
          0,
        ),
      );
      state = attachmentDraftReducer(state, {
        type: 'changed',
        draft: { text: keptText, attachments: [] },
      });
      render();
      await waitFor(() =>
        expect(shownText(canvas.getByRole('textbox'))).toBe(keptText),
      );
      await settleLayout('phone');
      await expect(
        await allToasts(attachmentSelectionFailureMessage),
      ).toHaveLength(0);
      state = attachmentDraftReducer(state, {
        type: 'pickFailed',
        key: 'second-pick',
      });
      render();
      await findToast(attachmentSelectionFailureMessage);
      await expect(shownText(canvas.getByRole('textbox'))).toBe(keptText);
    } finally {
      root.unmount();
    }
  },
};

export const ANewOversizedAttachmentToastsAlongsideTheOtherError: Story = {
  render: () => <View testID="controlled-errors" />,
  play: async ({ canvas }) => {
    const root = createRoot(canvas.getByTestId('controlled-errors'));

    const props = composerProps({
      ...meta.args,
      draft: {
        text: 'Keep this prompt.',
        attachments: [oversizedComposerImage],
      },
      error: selectionFailed,
      onDraftChange: fn(),
      onAttachImages: fn(),
      onSend: fn(),
    });

    try {
      root.render(imageComposer(props));
      await findToast(selectionFailed);
      await findToast(oversizedMessage);
      dismissToasts();
      await waitFor(async () =>
        expect(await allToasts(oversizedMessage)).toHaveLength(0),
      );
      root.render(
        imageComposer({ ...props, draft: { ...props.draft, text: keptText } }),
      );
      await waitFor(() =>
        expect(shownText(canvas.getByRole('textbox'))).toBe(keptText),
      );
      await settleLayout('phone');
      await expect(await allToasts(oversizedMessage)).toHaveLength(0);
      root.render(
        imageComposer({
          ...props,
          draft: {
            ...props.draft,
            attachments: [
              { ...oversizedComposerImage, id: 'second-large-image' },
            ],
          },
        }),
      );
      await findToast(oversizedMessage);
      await expect(await allToasts(selectionFailed)).toHaveLength(0);
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    } finally {
      root.unmount();
    }
  },
};
