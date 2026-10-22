import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Text } from '#primitives/content/text';
import { ContextMenu } from './context-menu';
import type { ContextMenuProps } from './context-menu-props';

// The row sits inside the story, not in args: Storybook walks an element in args into React internals while inferring arg types.
function ContextMenuExample(
  props: Omit<ContextMenuProps, 'children'>,
): React.JSX.Element {
  return (
    <ContextMenu {...props}>
      <View className="rounded-2xl bg-card p-4">
        <Text>Right-click this row</Text>
      </View>
    </ContextMenu>
  );
}

const meta = {
  title: 'Design System/Primitives/Overlays/ContextMenu',
  component: ContextMenuExample,
  // No Contracts schema: the props ContextMenuProps declares, less the element it opens on.
  argTypes: {
    groups: { control: false },
    groupTitles: { control: false },
    title: { control: 'text' },
    preview: { control: false },
  },
  args: {
    groups: [
      [{ label: 'Rename', icon: 'rename', onPress: action('rename') }],
      [{ label: 'Archive', icon: 'archive', onPress: action('archive') }],
    ],
  },
} satisfies Meta<typeof ContextMenuExample>;

export default meta;

type Story = StoryObj<typeof meta>;

// A right-click opens the menu at the pointer, its actions in one list.
export const RenameAndArchive: Story = {};
