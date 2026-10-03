import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { SessionScreen } from './SessionScreen';

const meta = {
  title: 'Tests/SessionScreen',
  component: SessionScreen,
  args: { id: 'session-1' },
} satisfies Meta<typeof SessionScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsSessionId: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('session-1')).toBeVisible();
  },
};
