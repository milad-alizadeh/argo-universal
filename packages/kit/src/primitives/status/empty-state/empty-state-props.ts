import type { ReactElement } from 'react';
import type { ButtonProps } from '#primitives/actions/button';
import type { KitProps } from '../../kit-props';

// Kit-only, for Add a Server's pages and not on the Plugin wire: `busy` draws a spinner where the icon would stand, for a page that waits; `note` is a card under the description that says where the owner acts, a muted line above the place itself.
export interface EmptyStateNote {
  lead: string;
  detail: string;
}

export type EmptyStateProps = KitProps<
  'EmptyState',
  string,
  ReactElement<ButtonProps>
> & {
  testID?: string;
  busy?: boolean;
  note?: EmptyStateNote;
};
