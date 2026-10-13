import type * as React from 'react';
import { Icon } from '../../../../lib/generic/symbols/icon';
export function SessionControlDisclosure(): React.JSX.Element {
  return (
    <Icon
      role="control"
      name="chevron-down"
      className="text-muted-foreground"
    />
  );
}
