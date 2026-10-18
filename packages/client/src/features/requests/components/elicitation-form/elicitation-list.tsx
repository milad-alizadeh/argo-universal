import type { ReactElement, ReactNode } from 'react';
import { List } from '#primitives/lists/list';

export function ElicitationList({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <List appearance="grouped" keyboardShouldPersistTaps="handled">
      {children}
    </List>
  );
}
