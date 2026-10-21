import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { EmptyState } from './empty-state';

const meta = {
  title: 'Design System/Primitives/Status/EmptyState',
  component: EmptyState,
  argTypes: kitArgTypes('EmptyState'),
  args: { title: 'No items yet' },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: 'sessions',
    description: 'Add an item to get started.',
    action: <Button label="Add item" />,
  },
};

export const NoAction: Story = {
  args: {
    title: 'Select an item',
    description: 'Choose an item from the list.',
  },
};

export const TitleOnly: Story = { args: { title: 'Nothing here' } };

export const Search: Story = {
  args: {
    icon: 'search',
    title: 'No matching items',
    description: 'No item has “query” in its title.',
  },
};

export const IconAndDescription: Story = {
  args: {
    icon: 'issue',
    title: 'No open items',
    description: 'All caught up.',
  },
};
