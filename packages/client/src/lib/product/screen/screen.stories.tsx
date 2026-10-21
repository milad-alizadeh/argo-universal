import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { Screen } from './screen';
import {
  bottomEdgeScreen,
  insetsDisabledScreen,
  safeAreaScreen,
} from './screen-fixtures';
import { ScreenPreview } from './screen-preview.mocks';

const meta = {
  title: 'Design System/Patterns/Screen',
  component: Screen,
  // The preview stands in for a phone, whose insets no browser reports.
  decorators: [
    (Story): ReactElement => (
      <ScreenPreview>
        <Story />
      </ScreenPreview>
    ),
  ],
  argTypes: {
    edges: { control: false },
    children: { control: false },
    style: { control: false },
  },
  args: safeAreaScreen,
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every edge is held clear: the phone's top inset above the content, its bottom inset below.
export const SafeArea: Story = { args: safeAreaScreen };

// Only the edges named are held clear, so the content runs under the status bar.
export const BottomEdge: Story = { args: bottomEdgeScreen };

// The Screen holds no inset clear and the content fills it.
export const InsetsDisabled: Story = { args: insetsDisabledScreen };
