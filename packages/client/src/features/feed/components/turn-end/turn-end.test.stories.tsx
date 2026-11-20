import type { TurnEnd } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { feedContentArgs } from '../feed-content/feed-content.mocks';
import { Feed } from '../feed/feed';
import { endings, turnEndItems } from './turn-end.mocks';

const meta = {
  title: 'Tests/Feed/TurnEnd',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedContentArgs,
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Feed announces an ending as a status, or as an alert when it is an error, and offers nothing to press.
function ending(end: TurnEnd, role: 'alert' | 'status', text: string): Story {
  return {
    args: { items: turnEndItems(end) },
    play: async ({ canvas }) => {
      await expect(canvas.getByRole(role)).toHaveTextContent(text);
      await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
    },
  };
}

export const Stopped = ending(endings.stopped, 'status', '1m 20s');

export const Errored = ending(
  endings.error,
  'alert',
  endings.error.error.message,
);
