import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../../lib/generic/variations';
import { ComposerWorkChips } from './composer-status';

const meta = {
  title: 'Composer/ComposerStatus',
  component: ComposerWorkChips,
  args: {
    disabled: false,
    status: {},
  },
} satisfies Meta<typeof ComposerWorkChips>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Status: Story = {
  name: 'Composer status',
  render: (args) => (
    <Variations>
      <Variation label="Subagents running">
        <View className="flex-row items-center gap-2">
          <ComposerWorkChips
            {...args}
            status={{
              subagents: {
                count: 2,
                running: true,
                onPress: action('Subagents'),
              },
              shells: { count: 1, running: false, onPress: action('Shells') },
            }}
          />
        </View>
      </Variation>
      <Variation label="Settled">
        <View className="flex-row items-center gap-2">
          <ComposerWorkChips
            {...args}
            status={{
              subagents: {
                count: 2,
                running: false,
                onPress: action('Subagents'),
              },
              shells: { count: 1, running: false, onPress: action('Shells') },
            }}
          />
        </View>
      </Variation>
    </Variations>
  ),
};
