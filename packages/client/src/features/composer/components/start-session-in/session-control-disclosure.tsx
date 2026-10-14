import type * as React from 'react';
import { Icon } from '#primitives/display/icon/icon';

export function SessionControlDisclosure(): React.JSX.Element {
  return (
    <Icon
      role="control"
      name="chevron-down"
      className="text-muted-foreground"
    />
  );
}
