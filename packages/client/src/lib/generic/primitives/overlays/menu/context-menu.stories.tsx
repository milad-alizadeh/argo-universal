import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Text } from '#primitives/display/text';
import { ContextMenu } from './context-menu';

const meta = {
  title: 'Design System/Primitives/ContextMenu',
  component: ContextMenu,
  args: {
    groups: [
      [{ label: 'Rename', icon: 'rename', onPress: action('rename') }],
      [{ label: 'Archive', icon: 'archive', onPress: action('archive') }],
    ],
    children: (
      <View className="rounded-2xl bg-card p-4">
        <Text>Right-click this row</Text>
      </View>
    ),
  },
} satisfies Meta<typeof ContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

// A right-click opens the menu at the pointer, its actions in one list.
export const RenameAndArchive: Story = { name: 'ContextMenu' };
