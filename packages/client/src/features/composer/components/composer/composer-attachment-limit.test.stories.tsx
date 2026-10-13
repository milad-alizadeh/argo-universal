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
import { shownText } from '../../../../../mocks/rich-textarea-example';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';

const meta = { ...composerTestMeta, title: 'Tests/Composer' };

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
        await expect(await canvas.findByRole('alert')).toHaveTextContent(
          'Attachment exceeds 20 MB.',
        );
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
        expect(canvas.queryByRole('alert')).not.toBeInTheDocument(),
      );
      await expect(shownText(canvas.getByRole('textbox'))).toBe(draft.text);
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
    } finally {
      root.unmount();
    }
  },
};
