import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { settleViewport } from '../../lib/generic/settle-viewport';
import { AtlasScreen } from './atlas-screen';

const meta = {
  title: 'Tests/AtlasScreen',
  component: AtlasScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof AtlasScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Atlas: Story = {
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await expect(canvas.getByText('Atlas will appear here.')).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Back to Settings' }),
      ).not.toBeInTheDocument();
    }
  },
};

export const AtlasDark: Story = { ...Atlas, globals: { mode: 'dark' } };
