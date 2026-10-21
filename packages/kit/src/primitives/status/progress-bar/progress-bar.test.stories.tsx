import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import presentationMeta, {
  Complete,
  NotStarted,
  Running,
  Waiting,
} from './progress-bar.stories';

const valueAttribute = 'aria-valuenow';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/progress-bar',
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
