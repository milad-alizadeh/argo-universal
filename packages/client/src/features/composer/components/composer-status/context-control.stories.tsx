import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { ComposerStatusControls } from './composer-status';

const meta = {
  title: 'Composer/ContextControl',
  component: ComposerStatusControls,
  args: {
    disabled: false,
    status: {},
  },
} satisfies Meta<typeof ComposerStatusControls>;

export default meta;

type Story = StoryObj<typeof meta>;

const onCompact = action('Compact');

const contextLevels = [
  { label: 'Low · 17%', context: { used: 34_000, size: 200_000 } },
  { label: 'High · 85%', context: { used: 170_000, size: 200_000, onCompact } },
  {
    label: 'Full · 100%',
    context: { used: 200_000, size: 200_000, onCompact },
  },
];

const usage = {
  limits: [
    { label: 'Session', usedPercent: 42, resets: 'Resets in 3 h' },
    { label: 'Weekly', usedPercent: 71, resets: 'Resets Monday' },
  ],
};

export const ContextControl: Story = {
  name: 'ContextControl',
  render: (args) => (
    <Variations>
      {contextLevels.map(({ label, context }) => (
        <Variation key={label} label={label}>
          <ComposerStatusControls {...args} status={{ context }} />
        </Variation>
      ))}
      <Variation label="Usage">
        <ComposerStatusControls {...args} status={{ usage }} />
      </Variation>
    </Variations>
  ),
};
