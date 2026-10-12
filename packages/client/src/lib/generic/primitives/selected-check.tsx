import type * as React from 'react';
import { Icon } from '../symbols/icon';

export function SelectedCheck({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return <Icon name="check" size="mark" className={className} />;
}
