import type * as React from 'react';
import { Icon } from '../../../symbols/icon';

// The chevron that says a row opens another page.
export function Disclosure({
  visible,
}: {
  visible: boolean;
}): React.JSX.Element | null {
  return visible ? (
    <Icon
      name="chevron-right"
      role="body"
      className="text-muted-foreground shrink-0"
    />
  ) : null;
}
