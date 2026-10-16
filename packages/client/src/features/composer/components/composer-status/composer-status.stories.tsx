import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { ComposerStatusControls, ComposerWorkChips } from './composer-status';

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

const runningStatus = {
  subagents: { count: 2, running: true, onPress: action('Subagents') },
  shells: { count: 1, running: false, onPress: action('Shells') },
};

const settledStatus = {
  ...runningStatus,
  subagents: { ...runningStatus.subagents, running: false },
};

const workPreviewClassName = 'flex-row items-center gap-2';

export const Status: Story = {
  name: 'Composer status',
  render: (args) => (
    <Variations>
      <Variation label="Subagents running">
        <View className={workPreviewClassName}>
          <ComposerWorkChips {...args} status={runningStatus} />
        </View>
      </Variation>
      <Variation label="Settled">
        <View className={workPreviewClassName}>
          <ComposerWorkChips {...args} status={settledStatus} />
        </View>
      </Variation>
    </Variations>
  ),
};

const contextLevels = [
  { label: 'Low · 17%', context: { used: 34_000, size: 200_000 } },
  { label: 'High · 85%', context: { used: 170_000, size: 200_000 } },
  { label: 'Full · 100%', context: { used: 200_000, size: 200_000 } },
];

export const ContextRing: Story = {
  name: 'Context ring',
  render: (args) => (
    <Variations>
      {contextLevels.map(({ label, context }) => (
        <Variation key={label} label={label}>
          <View className={workPreviewClassName}>
            <ComposerStatusControls
              disabled={args.disabled}
              status={{ context }}
            />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
