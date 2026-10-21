import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Slider } from '#primitives/inputs/slider';
import { List } from '#primitives/lists/list';
import { Pill } from '#primitives/status/pill';
import { ListItem } from './index';

const meta = {
  title: 'Design System/Primitives/Lists/ListItem',
  component: ListItem,
  args: { title: 'Item one' },
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

export const Default: Story = {};

export const Selected: Story = {
  args: {
    title: 'Item two',
    subtitle: 'Subtitle',
    selected: true,
    onPress: action('select row'),
  },
};

export const Progress: Story = {
  args: {
    title: 'Item three',
    subtitle: 'Subtitle',
    meta: <Pill text="Meta" />,
    progress: { value: 0.4, tone: 'success', active: true },
  },
};

export const Disabled: Story = {
  args: {
    title: 'Disabled item',
    disabled: true,
    badge: 3,
    onPress: action('select row'),
  },
};

export const StatusBadge: Story = {
  args: {
    title: 'Item four',
    subtitle: 'Subtitle',
    badge: { kind: 'status', tone: 'warning', label: 'Warning' },
  },
};

export const Control: Story = {
  args: {
    title: 'Effort',
    value: 'High',
    control: (
      <Slider
        accessibilityLabel="Effort"
        valueLabel="High"
        minimumValue={0}
        maximumValue={3}
        step={1}
        value={2}
        onValueChange={action('change effort')}
      />
    ),
  },
};

export const Loading: Story = {
  args: { isLoading: true, leading: null, subtitle: 'Subtitle', meta: 'Meta' },
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
  args: { title: 'No items', tone: 'muted' },
  parameters: {
    docs: { description: { story: "An empty section's line." } },
  },
};
