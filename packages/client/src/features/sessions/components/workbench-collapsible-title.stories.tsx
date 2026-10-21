import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { ChangeDiffTotal } from './change-diff-total';
import { WorkbenchCollapsibleTitle } from './workbench-collapsible-title';
import { InteractiveWorkbenchTitle } from './workbench-collapsible-title.mocks';

const meta = {
  title: 'Sessions/WorkbenchCollapsibleTitle',
  component: WorkbenchCollapsibleTitle,
  args: {
    title: 'Changes',
    icon: 'diff',
    onPress: fn(),
    summary: <ChangeDiffTotal files={3} additions={24} deletions={6} />,
  },
} satisfies Meta<typeof WorkbenchCollapsibleTitle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'WorkbenchCollapsibleTitle',
  render: (args) => (
    <Variations>
      {[true, false].map((expanded) => (
        <Variation
          key={String(expanded)}
          label={expanded ? 'Expanded' : 'Collapsed'}
        >
          <View className="w-frame-list">
            <InteractiveWorkbenchTitle {...args} expanded={expanded} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};
