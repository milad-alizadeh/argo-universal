import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, within } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import {
  type MockAgent,
  recordedImageUrl,
  recordedUserMessage,
} from '../../mocks/feed-message-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { UserMessage } from './user-message';

const meta = {
  title: 'Tests/UserMessage',
  globals: { themeId: 'default', mode: 'light' },
  component: UserMessage,
  // The Feed gives every row its full width.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: {
    row: recordedUserMessage('agent-1', 'interrupt'),
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof UserMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

const widths = [layoutWidths.phone, layoutWidths.wide];

export const InlineCode: Story = {
  play: async ({ canvas }) => {
    for (const width of widths) {
      await settleViewport(width);
      const codeElement = canvas.getAllByText('sleep 20 && echo done', {
        exact: true,
      })[0];
      await expect(codeElement).toBeVisible();
      await expect(
        canvas.getAllByText(/^Run the shell command/)[0],
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Show more' }),
      ).toBeNull();
    }
  },
};

function opensImage(agent: MockAgent, width: number): Story {
  return {
    args: { row: recordedUserMessage(agent, 'image-prompt') },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(within(document.body).queryByRole('dialog')).toBeNull();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open image, 32×32' }),
      );
      const dialog = await within(document.body).findByRole('dialog');
      const image = within(dialog).getByRole('img', { name: '32×32' });
      await expect(image.getBoundingClientRect().width).toBeGreaterThan(120);
      await userEvent.keyboard('{Escape}');
      await expect(within(document.body).queryByRole('dialog')).toBeNull();
    },
  };
}
export const FirstAgentOpensImagePhone = opensImage(
  'agent-1',
  layoutWidths.phone,
);
export const FirstAgentOpensImageWide = opensImage(
  'agent-1',
  layoutWidths.wide,
);
export const SecondAgentOpensImagePhone = opensImage(
  'agent-2',
  layoutWidths.phone,
);
export const SecondAgentOpensImageWide = opensImage(
  'agent-2',
  layoutWidths.wide,
);

// The long prompt passes four lines on a phone and fits on a wide screen.
export const ShowMore: Story = {
  args: { row: recordedUserMessage('agent-2', 'markdown-answer') },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Show more' }),
    );
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
    await expect(
      canvas.getAllByText(/^Without using/)[0]?.getBoundingClientRect().height,
    ).toBeGreaterThan(80);
  },
};
