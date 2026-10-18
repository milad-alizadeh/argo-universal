import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { ScrollView } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { SessionLayout } from '#lib/product/session-layout';
import { Text } from '#primitives/content/text';
import { composerProps } from '../../../../../mocks/composer-mock';
import { findToast } from '../../../../../mocks/find-toast';
import { canPointAt } from '../../../../../mocks/point-hit';
import { shownText } from '../../../../../mocks/shown-text';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Composer } from './composer';

const failedAttachment = 'Could not attach the selected image.';

const draft = { text: 'Keep this prompt.', attachments: [] };

const meta = {
  title: 'Tests/Composer',
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
