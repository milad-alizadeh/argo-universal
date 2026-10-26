import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { PathText } from './path-text';
import {
  longPath,
  quietPath,
  rootFilePath,
  scrollingPath,
  shortPath,
} from './path-text-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/PathText',
  component: PathText,
  // An Argo-internal primitive: it has no Contracts schema to read an argTypes table from.
  argTypes: {},
  decorators: [
    (Story): ReactElement => (
      <View style={{ width: 240 }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof PathText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Uncut: Story = { args: shortPath };

export const RootFile: Story = { args: rootFilePath };

export const Cut: Story = {
  args: longPath,
  parameters: {
    docs: {
      description: {
        story:
          'The folder gives up its start, never the name. On web the whole path shows in a tooltip, only while it is cut.',
      },
    },
  },
};

export const Quiet: Story = { args: quietPath };

export const Scrolling: Story = { args: scrollingPath };
