import type * as React from 'react';
import type { IconRole } from '../../symbols/icon-role';
import { Icon } from '../../symbols/icon';

export function SelectedCheck({
  className,
  role = 'mark',
}: {
  className?: string;
  role?: Extract<IconRole, 'mark' | 'body'>;
}): React.JSX.Element {
  return <Icon name="check" role={role} className={className} />;
}
