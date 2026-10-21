import { layoutWidths } from '@repo/kit/each-layout';
import { findToast } from '@repo/kit/mocks/find-toast';
import { canPointAt } from '@repo/kit/mocks/point-hit';
import { shownText } from '@repo/kit/mocks/shown-text';
import { Text } from '@repo/kit/primitives/content/text';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { ScrollView } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { SessionLayout } from '#lib/product/session-layout';
import { composerProps } from '../../../../../mocks/composer-mock';
import { Composer } from './composer';

const failedAttachment = 'Could not attach the selected image.';

const draft = { text: 'Keep this prompt.', attachments: [] };

const meta = {
  title: 'Tests/Composer/Error',
  component: Composer,
  parameters: { screenPreview: true },
  args: composerProps({
    draft,
    error: failedAttachment,
    onDraftChange: fn(),
    onAttachImages: fn(),
    onSend: fn(),
  }),
  render: (args): React.JSX.Element => (
    <SessionLayout
      header={null}
      feed={
        <ScrollView className="flex-1">
          <Text>{'A long Feed entry.\n'.repeat(100)}</Text>
        </ScrollView>
      }
      composer={<Composer {...args} />}
    />
  ),
} satisfies Meta<typeof Composer>;

export default meta;

type Story = StoryObj<typeof meta>;

function errorKeepsComposerReachable(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await findToast(failedAttachment);
      const layout = within(canvas.getByTestId('session-layout'));
      await expect(
        layout.queryByText(failedAttachment),
      ).not.toBeInTheDocument();
      await expect(layout.queryByRole('alert')).not.toBeInTheDocument();
      const message = canvas.getByRole('textbox', { name: 'Message' });
      const send = canvas.getByRole('button', { name: 'Send' });
      await expect(shownText(message)).toBe(draft.text);

      for (const control of [message, send]) {
        await expect(control).toBeVisible();
        await waitFor(() => expect(canPointAt(control)).toBe(true));
      }

      await userEvent.click(send);
      await expect(args.onSend).toHaveBeenCalledWith(draft);
    },
  };
}

export const PhoneErrorKeepsComposerReachable = errorKeepsComposerReachable(
  layoutWidths.phone,
);

export const WideErrorKeepsComposerReachable = errorKeepsComposerReachable(
  layoutWidths.wide,
);
