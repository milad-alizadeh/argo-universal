import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { Variation, Variations } from '../../../lib/generic/variations';
import { ChangeRow } from './change-row';
import { pullRequestMocks } from './session-pull-request.mocks';

// Paper 24GB-0: Components / ChangeRow, including the checks donut states.
const meta = {
  title: 'Sessions/ChangeRow',
  component: ChangeRow,
  args: { change: pullRequestMocks.checksRunning, onOpen: fn() },
} satisfies Meta<typeof ChangeRow>;

export default meta;

type Story = StoryObj<typeof meta>;

const states = [
  ['Open · running', pullRequestMocks.checksRunning],
  ['Open · failed', pullRequestMocks.checksFailing],
  ['Open · passing', pullRequestMocks.checksPassed],
  ['Open · draft', pullRequestMocks.followUp],
  ['Merged', pullRequestMocks.merged],
  ['Closed', pullRequestMocks.closed],
] as const;

export const Overview: Story = {
  name: 'ChangeRow',
  render: ({ onOpen }) => (
    <Variations>
      {states.map(([name, change]) => (
        <Variation key={name} label={name}>
          <View className="w-frame-list">
            <ChangeRow change={change} onOpen={onOpen} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
