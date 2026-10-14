import type * as React from 'react';
import { Icon } from '#primitives/display/icon';
import type { SelectedCheckProps } from './selected-check-props';

export function SelectedCheck({
  className,
  role = 'mark',
}: SelectedCheckProps): React.JSX.Element {
  return <Icon name="check" role={role} className={className} />;
}
