import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { PullRequestIndicator } from './PullRequestIndicator';

const meta = {
  title: 'Shared/PullRequestIndicator',
  component: PullRequestIndicator,
  args: { number: 44, status: 'merged' },
} satisfies Meta<typeof PullRequestIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PullRequestNumber: Story = {
  name: 'Number',
  render: (args) => (
    <Variations>
      {[1, 44, 12345].map((number) => (
        <Variation key={number} label={`#${number}`}>
          <PullRequestIndicator {...args} number={number} />
        </Variation>
      ))}
    </Variations>
  ),
};

export const Status: Story = {
  render: (args) => (
    <Variations>
      {(['open', 'draft', 'merged', 'conflict', 'closed'] as const).map(
        (status) => (
          <Variation key={status} label={status}>
            <PullRequestIndicator {...args} status={status} />
          </Variation>
        ),
      )}
    </Variations>
  ),
};
