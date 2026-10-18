import type * as React from 'react';
import { Icon } from '#primitives/content/icon';
import type { SelectedCheckProps } from './selected-check-props';

// A row's trailing check sits beside its label, so it takes the size of an icon beside Body text.
export function SelectedCheck({
  className,
}: SelectedCheckProps): React.JSX.Element {
  return <Icon name="check" role="body" className={className} />;
}
