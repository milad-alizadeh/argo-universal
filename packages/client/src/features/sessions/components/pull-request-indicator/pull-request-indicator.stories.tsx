import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { PullRequestIndicator } from './pull-request-indicator';

const meta = {
  title: 'Sessions/PullRequestIndicator',
  component: PullRequestIndicator,
  args: { number: 44, status: 'merged' },
} satisfies Meta<typeof PullRequestIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

const statusVariations = [
  ['Open', 'open'],
  ['Draft', 'draft'],
  ['Merged', 'merged'],
  ['Conflict', 'conflict'],
  ['Closed', 'closed'],
] as const;

export const Overview: Story = {
  name: 'PullRequestIndicator',
  render: (args) => (
    <Variations>
      {statusVariations.map(([label, status]) => (
        <Variation key={status} label={label}>
          <PullRequestIndicator {...args} status={status} />
        </Variation>
      ))}
      <Variation label="Long number">
        <PullRequestIndicator {...args} number={12345} />
      </Variation>
    </Variations>
  ),
};
