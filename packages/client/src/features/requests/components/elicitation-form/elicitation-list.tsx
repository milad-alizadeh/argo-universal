import { List } from '@repo/kit/primitives/lists/list';
import type { ReactElement, ReactNode } from 'react';

export function ElicitationList({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <List appearance="cards" keyboardShouldPersistTaps="handled">
      {children}
    </List>
  );
}
