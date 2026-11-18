import type { ReactElement } from 'react';
import type { ButtonProps } from '#primitives/actions/button';
import type { KitProps } from '../../kit-props';

export type EmptyStateProps = KitProps<
  'EmptyState',
  string,
  ReactElement<ButtonProps>
> & {
  testID?: string;
};
