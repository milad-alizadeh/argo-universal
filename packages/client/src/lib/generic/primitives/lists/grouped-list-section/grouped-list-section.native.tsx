import type { ReactElement } from 'react';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { GroupedListSection as WebSection } from './grouped-list-section.tsx';
import { NativeSection } from './native-section';

export function GroupedListSection(
  props: GroupedListSectionProps,
): ReactElement {
  if (useWide()) return <WebSection {...props} />;

  return <NativeSection {...props} />;
}
