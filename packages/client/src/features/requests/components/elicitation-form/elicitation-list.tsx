import type { ReactElement, ReactNode } from 'react';
import { GroupedList } from '#primitives/lists/grouped-list';

// The request's rows: a content-sized group, in the card or in a narrow window's sheet.
export function ElicitationList({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <GroupedList fit>{children}</GroupedList>;
}
