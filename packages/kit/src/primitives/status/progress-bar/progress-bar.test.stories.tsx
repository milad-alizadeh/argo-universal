import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import presentationMeta, {
  Complete,
  NotStarted,
  Running,
  Steps,
  Waiting,
} from './progress-bar.stories';

const valueAttribute = 'aria-valuenow';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/Status/ProgressBar',
};

export default meta;

type Story = StoryObj<typeof meta>;

// Each state reads its own value, so each one is its own story.
function reads(story: Story, name: string, value: string): Story {
  return {
    ...story,
    play: async ({ canvas }) => {
      await expect(canvas.getByRole('progressbar', { name })).toHaveAttribute(
        valueAttribute,
        value,
      );
    },
  };
}

export const RunningValue: Story = reads(Running, 'Plan', '40');

export const WaitingValue: Story = reads(Waiting, 'Jobs', '75');

export const NotStartedValue: Story = reads(NotStarted, 'Queued', '0');

export const CompleteValue: Story = reads(Complete, 'Complete', '100');

// A last step underway reads 75 and keeps its own pale segment.
export const StepsValue: Story = {
  ...Steps,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('progressbar', { name: 'Todos' }),
    ).toHaveAttribute(valueAttribute, '75');
    await expect(canvas.getAllByTestId('todos-step-done')).toHaveLength(3);
    await expect(canvas.getAllByTestId('todos-step-started')).toHaveLength(1);
    await expect(
      canvas.queryByTestId('todos-step-pending'),
    ).not.toBeInTheDocument();
  },
};
