import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Icon } from './icon';

const meta = { title: 'Tests/IconStatus' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsCornerStatus: Story = {
  render: () => (
    <Icon
      name="agent"
      role="control"
      testID="agent-icon"
      status={{ tone: 'warning', pulse: true }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('agent-icon-warning')).toBeVisible();
  },
};
