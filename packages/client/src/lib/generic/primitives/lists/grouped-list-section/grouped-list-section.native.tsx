import type { ReactElement } from 'react';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { NativeSection } from './native-section';

// The native list's section at every size class.
export function GroupedListSection(
  props: GroupedListSectionProps,
): ReactElement {
  return <NativeSection {...props} />;
}
