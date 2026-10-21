import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Slider } from '#primitives/inputs/slider';
import { List } from '#primitives/lists/list';
import { ListItem } from './index';
import {
  controlListItem,
  defaultListItem,
  disabledListItem,
  effortSlider,
  loadingListItem,
  mutedListItem,
  progressListItem,
  selectedListItem,
  statusBadgeListItem,
} from './list-item-fixtures';

const meta = {
  title: 'Design System/Primitives/Lists/ListItem',
  component: ListItem,
  argTypes: kitArgTypes('ListItem'),
  // A card list at a page's width, as the row stands in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-90">
        <List appearance="cards" maxHeight={200}>
          <Story />
        </List>
      </View>
    ),
  ],
} satisfies Meta<typeof ListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: defaultListItem };

export const Selected: Story = {
  args: { ...selectedListItem, onPress: action('select row') },
};

export const Progress: Story = { args: progressListItem };

export const Disabled: Story = {
  args: { ...disabledListItem, onPress: action('select row') },
};

export const StatusBadge: Story = { args: statusBadgeListItem };

export const Control: Story = {
  args: {
    ...controlListItem,
    control: (
      <Slider {...effortSlider} onValueChange={action('change effort')} />
    ),
  },
};

export const Loading: Story = {
  args: loadingListItem,
  parameters: {
    docs: {
      description: {
        story:
          'A loading row keeps the lines it stands in for, each a bar as wide as its placeholder text.',
      },
    },
  },
};

export const Muted: Story = {
  args: mutedListItem,
  parameters: {
    docs: { description: { story: "An empty section's line." } },
  },
};
