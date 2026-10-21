import { layoutWidths } from '@repo/kit/each-layout';
import { findToast } from '@repo/kit/mocks/find-toast';
import { shownText } from '@repo/kit/mocks/shown-text';
import { settleViewport } from '@repo/kit/settle-viewport';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { expect } from 'storybook/test';
import { waitFor } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import { oversizedComposerImage } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { imageComposer } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';

const meta = { ...composerTestMeta, title: 'Tests/Composer/AttachmentLimit' };

export default meta;

export const ImageTooLarge: Story = {
  render: () => <View testID="controlled-images" />,
  play: async ({ canvas, userEvent }) => {
    const root = createRoot(canvas.getByTestId('controlled-images'));
    const onDraftChange = fn();

    const draft = {
      text: 'Match these screenshots.',
      attachments: [oversizedComposerImage],
    };

    const props = composerProps({
      draft,
      onDraftChange,
      onSend: fn(),
      onAttachImages: fn(),
    });

    try {
      root.render(imageComposer(props));

      for (const width of [layoutWidths.phone, layoutWidths.wide]) {
        await settleViewport(width);
        await expect(
          await findToast('Attachment exceeds 20 MB.'),
        ).toBeVisible();
        await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
        await expect(
          canvas.getByRole('button', { name: 'Send' }),
        ).toBeDisabled();
      }

      await expect(canvas.getByRole('textbox')).toBeEnabled();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Remove full-screen.png' }),
      );
      await expect(onDraftChange).toHaveBeenCalledWith({
        text: draft.text,
        attachments: [],
      });
      root.render(
        imageComposer({
          ...props,
          draft: { text: draft.text, attachments: [] },
        }),
      );
      await waitFor(() =>
        expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled(),
      );
      await expect(shownText(canvas.getByRole('textbox'))).toBe(draft.text);
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
    } finally {
      root.unmount();
    }
  },
};
