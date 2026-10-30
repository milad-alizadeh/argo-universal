import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Pressable, View } from 'react-native';
import { action } from 'storybook/actions';
import { kitArgTypes } from '#kit/kit-arg-types';
import { effortSlider } from '#kit/primitives/controls/slider/slider-fixtures';
import { Slider } from '#primitives/controls/slider';
import { List } from '#primitives/lists/list';
import { Pill } from '#primitives/status/pill';
import { ListItem } from './index';
import {
  controlListItem,
  defaultListItem,
  disabledListItem,
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

export const Muted: Story = {
  args: mutedListItem,
  parameters: {
    docs: { description: { story: "An empty section's line." } },
  },
};

export const SubtitleIcon: Story = {
  args: {
    title: 'Item five',
    subtitle: 'Awaiting review',
    subtitleIcon: { sf: 'ticket', material: 'confirmation_number' },
  },
  parameters: {
    docs: {
      description: { story: 'A glyph leads the subtitle, in its tone.' },
    },
  },
};

export const Accessories: Story = {
  args: {
    title: 'Item six',
    subtitle: 'Subtitle',
    meta: <Pill text="Meta" />,
    metaAccessories: (
      <Pressable
        role="link"
        accessibilityLabel="Open issue 42"
        onPress={action('open issue')}
      >
        <Pill text="#42" />
      </Pressable>
    ),
    onPress: action('open row'),
  },
  parameters: {
    docs: {
      description: {
        story:
          "An accessory has its own press beside the row's: pressing the pill opens the issue, pressing anywhere else opens the row.",
      },
    },
  },
};
