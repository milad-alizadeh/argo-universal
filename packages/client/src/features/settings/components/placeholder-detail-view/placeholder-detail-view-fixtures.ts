import type { PlaceholderDetailViewProps } from './placeholder-detail-view';

// Settings pages the App cannot show yet; the title, caption and note are copy, not states.
export const accountsPlaceholder = {
  title: 'Accounts',
  caption: 'What this App is talking to',
  description: 'Accounts will appear here.',
} satisfies PlaceholderDetailViewProps;

export const devicesPlaceholder = {
  title: 'Devices',
  description: 'Devices will appear here.',
} satisfies PlaceholderDetailViewProps;
