import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#lib/generic/kit-arg-types';
import { Button } from '#primitives/actions/button';
import { Variation, Variations } from '../../../variations';
import { EmptyState } from './empty-state';
import type { EmptyStateProps } from './empty-state-props';

const sessions = {
  icon: 'sessions',
  title: 'No items yet',
  description: 'Add an item to get started.',
  action: <Button label="Add item" />,
} satisfies EmptyStateProps;

const issues = {
  icon: 'issue',
  title: 'No open items',
  description: 'All caught up.',
} satisfies EmptyStateProps;

const detail = {
  title: 'Select an item',
  description: 'Choose an item from the list.',
} satisfies EmptyStateProps;

const plugin = {
  title: 'Nothing here',
} satisfies EmptyStateProps;

const examples = [
  ['Default', sessions],
  ['No action', detail],
  ['Title only', plugin],
  [
    'Search',
    {
      ...sessions,
      icon: 'search',
      title: 'No matching items',
      description: 'No item has “query” in its title.',
      action: undefined,
    },
  ],
  ['Icon and description', issues],
] as const;

const meta = {
  title: 'Design System/Primitives/Status/EmptyState',
  component: EmptyState,
  argTypes: kitArgTypes('EmptyState'),
  args: {
    icon: sessions.icon,
    title: sessions.title,
    description: sessions.description,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'EmptyState',
  render: () => (
    <Variations>
      {examples.map(([label, props]) => (
        <Variation key={label} label={label}>
          <EmptyState {...props} />
        </Variation>
      ))}
    </Variations>
  ),
};
