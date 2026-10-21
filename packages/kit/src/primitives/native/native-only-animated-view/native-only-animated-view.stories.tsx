import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { NativeOnlyAnimatedView } from './native-only-animated-view';
import { defaultNativeOnlyAnimatedView } from './native-only-animated-view-fixtures';

/*
 * No argTypes: a children-only wrapper declares no enumerable props of its own, so this page has no props table
 * (docs/agents/storybook.md records it as one of those pages).
 */
const meta = {
  title: 'Design System/Primitives/Native/NativeOnlyAnimatedView',
  component: NativeOnlyAnimatedView,
  tags: ['third-party'],
} satisfies Meta<typeof NativeOnlyAnimatedView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: defaultNativeOnlyAnimatedView };
