import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import presentationMeta, { Running, Steps } from './progress-bar.stories';

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

// A last step underway reads 75 and keeps its own pale segment.
export const StepsValue: Story = {
  ...Steps,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('progressbar', { name: 'Todos' }),
    ).toHaveAttribute('aria-valuenow', '75');
    await expect(canvas.getAllByTestId('todos-step-done')).toHaveLength(3);
    await expect(canvas.getAllByTestId('todos-step-started')).toHaveLength(1);
    await expect(
      canvas.queryByTestId('todos-step-pending'),
    ).not.toBeInTheDocument();
  },
};
