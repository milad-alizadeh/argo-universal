import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { InfoPopover } from './info-popover';
import { Text } from './text';

const meta = {
  title: 'Design System/Primitives/InfoPopover',
  component: InfoPopover,
  args: {
    accessibilityLabel: 'About effort',
    text: 'More effort trades speed for deeper reasoning.',
  },
} satisfies Meta<typeof InfoPopover>;
export default meta;

// Drawn as it sits in the phone Effort row: the "i" after the label, the level on the right.
export const InfoPopoverStory: StoryObj<typeof meta> = {
  name: 'InfoPopover',
  render: (args) => (
    <View className="w-96 px-gutter pt-24">
      <View className="h-11 flex-row items-center gap-2">
        <Text selectable={false} role="body" className="select-none">
          Effort
        </Text>
        <View className="-ml-2">
          <InfoPopover {...args} />
        </View>
        <View className="flex-1" />
        <EffortValue />
      </View>
    </View>
  ),
};

function EffortValue(): React.JSX.Element {
  return (
    <Text
      selectable={false}
      role="body"
      className="select-none text-muted-foreground"
    >
      High
    </Text>
  );
}
