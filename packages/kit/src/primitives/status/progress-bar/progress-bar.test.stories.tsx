import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import presentationMeta, { Running } from './progress-bar.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/Status/ProgressBar',
};

export default meta;

type Story = StoryObj<typeof meta>;

export const RunningValue: Story = {
  ...Running,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('progressbar', { name: 'Plan' }),
    ).toHaveAttribute('aria-valuenow', '40');
  },
};
