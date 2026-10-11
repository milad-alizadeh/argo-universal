import type * as React from 'react';
import { ScopedVariables } from 'uniwind';
import { Icon, useIconPixels } from '../symbols/icon';

export function MenuCheck(): React.JSX.Element {
  const pixels = useIconPixels('menu-check');
  return (
    <ScopedVariables variables={{ '--spacing-icon-md': pixels }}>
      <Icon name="check" className="text-popover-foreground" />
    </ScopedVariables>
  );
}
