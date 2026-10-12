import type * as React from 'react';
import { Icon } from '../../symbols/icon';
import type { IconRole } from '../../symbols/icon-role';

export function SelectedCheck({
  className,
  role = 'mark',
}: {
  className?: string;
  role?: Extract<IconRole, 'mark' | 'body'>;
}): React.JSX.Element {
  return <Icon name="check" role={role} className={className} />;
}
