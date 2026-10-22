import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { NativeOnlyAnimatedView } from './native-only-animated-view';
import { defaultNativeOnlyAnimatedView } from './native-only-animated-view-fixtures';

// A children-only wrapper declares no props of its own, so there is nothing for a Control or a props table to carry.
const meta = {
  title: 'Design System/Primitives/Native/NativeOnlyAnimatedView',
  component: NativeOnlyAnimatedView,
  tags: ['third-party', '!autodocs'],
} satisfies Meta<typeof NativeOnlyAnimatedView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: defaultNativeOnlyAnimatedView };
