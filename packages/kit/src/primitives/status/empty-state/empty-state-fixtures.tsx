import { Button } from '#primitives/actions/button';
import type { EmptyStateProps } from './empty-state-props';

export const defaultEmptyState = {
  icon: 'sessions',
  title: 'No items yet',
  description: 'Add an item to get started.',
  action: <Button label="Add item" />,
} satisfies EmptyStateProps;

export const noActionEmptyState = {
  title: 'Select an item',
  description: 'Choose an item from the list.',
} satisfies EmptyStateProps;

export const titleOnlyEmptyState = {
  title: 'Nothing here',
} satisfies EmptyStateProps;

export const searchEmptyState = {
  icon: 'search',
  title: 'No matching items',
  description: 'No item has “query” in its title.',
} satisfies EmptyStateProps;

export const iconAndDescriptionEmptyState = {
  icon: 'issue',
  title: 'No open items',
  description: 'All caught up.',
} satisfies EmptyStateProps;
