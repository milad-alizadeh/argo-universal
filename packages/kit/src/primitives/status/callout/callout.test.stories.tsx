import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Callout } from './callout';

const meta = {
  title: 'Tests/Design System/Primitives/Status/Callout',
  component: Callout,
  args: { title: 'Failed to Launch', description: 'Agent exited' },
} satisfies Meta<typeof Callout>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

const heading = { name: 'Failed to Launch' };

// A phone's callout sheet closes with a swipe or Escape, so the page under it stays reachable.
export const PhoneSheetDismisses: Story = {
  beforeEach: (): Promise<void> => settleLayout('phone'),
  play: async ({ userEvent }) => {
    await expect(await body.findByRole('heading', heading)).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(body.queryByRole('heading', heading)).toBeNull(),
    );
  },
};
