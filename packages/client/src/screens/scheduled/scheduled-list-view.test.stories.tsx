import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { scheduledListFixture } from './scheduled-fixtures';
import { ScheduledListView } from './scheduled-list-view';
import { scheduleHref } from './scheduled-screens';

const open = fn(scheduleHref);

const meta = {
  title: 'Tests/Screens/Scheduled',
  component: ScheduledListView,
  args: { ...scheduledListFixture, onCreate: fn(), onOpen: open },
  parameters: { screenPreview: true },
} satisfies Meta<typeof ScheduledListView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpensTheLatestSessionUnderScheduled: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Review recent changes' }),
    );
    await expect(open).toHaveReturnedWith({
      pathname: '/scheduled/[id]',
      params: { id: 'review-changes', sessionId: 'latest-session' },
    });

    await userEvent.click(
      canvas.getByRole('button', { name: 'Review the build' }),
    );
    await expect(open).toHaveReturnedWith({
      pathname: '/scheduled/[id]',
      params: { id: 'review-build', sessionId: '' },
    });
  },
};
