import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Fader } from './fader';
import {
  disabledFader,
  horizontalFader,
  noFillFader,
  verticalFader,
} from './fader-fixtures';
import { FaderTiles, HeldFader } from './fader.mocks';

// The Fader takes the size its parent gives it, so each state sits in a parent of a tile's size.
const meta = {
  title: 'Design System/Primitives/Controls/Fader',
  component: Fader,
  args: { onValueChange: fn() },
  argTypes: kitArgTypes('Fader'),
  decorators: [
    (Story, context): React.JSX.Element =>
      context.parameters['screenPreview'] ? (
        <Story />
      ) : (
        <View
          className={
            context.args.orientation === 'horizontal' ? 'w-96' : 'h-64 w-48'
          }
        >
          <Story />
        </View>
      ),
  ],
  render: (args): React.JSX.Element => (
    <HeldFader {...args}>
      <Text role="row">Label</Text>
      <Text role="secondary">Secondary</Text>
    </HeldFader>
  ),
} satisfies Meta<typeof Fader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = { args: verticalFader };

export const Horizontal: Story = { args: horizontalFader };

export const NoFill: Story = { args: noFillFader };

export const Disabled: Story = { args: disabledFader };

// A room of lights as a Plugin draws them: a bar over a grid of tiles, each with a title, a button and its value.
export const Tiles: Story = {
  args: verticalFader,
  parameters: { screenPreview: true },
  decorators: [],
  render: (): React.JSX.Element => (
    <View className="w-full p-5">
      <FaderTiles />
    </View>
  ),
};
