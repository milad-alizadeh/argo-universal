import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { WorkbenchColumn } from './workbench-column';
import { oneCard, threeCards } from './workbench-column-fixtures';

const meta = {
  title: 'Sessions/WorkbenchColumn',
  component: WorkbenchColumn,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
      <View className="m-4 w-frame-list">
        <Story />
      </View>
    ),
  ],
  argTypes: {
    cards: {
      control: false,
      description:
        'The cards to place, each with an id, a name for its handle and a render function that takes the handle.',
    },
  },
  args: { cards: threeCards },
} satisfies Meta<typeof WorkbenchColumn>;

export default meta;

type Story = StoryObj<typeof meta>;

// Hold a handle and drag to reorder on desktop and web; the arrow keys move a focused handle.
export const ThreeCards: Story = {};

// Nothing to reorder: a lone card has no handle.
export const OneCard: Story = { args: { cards: oneCard } };
