import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { JumpToLatestButton } from './list-jump-to-latest';

const rows = [
  'First row of the log',
  'Second row of the log',
  'Third row of the log',
  'Fourth row of the log',
];

// The button floats over rows, so the material has content to draw over: the iOS preview draws system Liquid Glass on iOS 26 and later, and elsewhere the shared fallback.
function OverRows({ children }: { children: ReactElement }): ReactElement {
  return (
    <View className="h-48 w-full items-center justify-center">
      <View className="absolute inset-0 items-center justify-around">
        {rows.map((row) => (
          <Text key={row} role="title">
            {row}
          </Text>
        ))}
      </View>
      {children}
    </View>
  );
}

const meta = {
  title: 'Design System/Primitives/Lists/ListJumpToLatest',
  component: JumpToLatestButton,
  argTypes: {
    hasNewRows: { control: 'boolean' },
    onPress: { control: false },
  },
  args: { hasNewRows: false, onPress: fn() },
  render: (args): ReactElement => (
    <OverRows>
      <JumpToLatestButton {...args} />
    </OverRows>
  ),
} satisfies Meta<typeof JumpToLatestButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AtRest: Story = {};

export const NewRows: Story = { args: { hasNewRows: true } };
