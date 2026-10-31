import type { PlaceholderDetailViewProps } from './placeholder-detail-view';

// Settings pages the App cannot show yet; the title and the note are copy, not states.
export const accountsPlaceholder = {
  title: 'Accounts',
  description: 'Accounts will appear here.',
} satisfies PlaceholderDetailViewProps;

export const devicesPlaceholder = {
  title: 'Devices',
  description: 'Devices will appear here.',
} satisfies PlaceholderDetailViewProps;
