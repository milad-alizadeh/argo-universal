import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { logoSources } from '../../../symbols/logo-source';
import { Icon } from './icon';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Icon',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsCornerStatus: Story = {
  render: () => (
    <Icon
      name="agent"
      size="sm"
      testID="agent-icon"
      status={{ tone: 'warning', pulse: true }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('agent-icon-warning')).toBeVisible();
  },
};

export const SpeaksLogoName: Story = {
  render: () => <Icon source={logoSources.github} size="sm" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'GitHub' })).toBeVisible();
  },
};
