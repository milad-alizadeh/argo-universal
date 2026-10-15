import type * as React from 'react';
import { ScrollView } from 'react-native';
import { FieldLayout } from '#primitives/fields/field-layout';
import {
  ScrollColumnContext,
  useScrollColumnStyle,
} from '../../../scroll-column';
import { cn } from '../../../utils';
import type { GroupedListProps } from './grouped-list-props';
import { groupedListGap, groupedListPadding } from './grouped-list-spacing';

export function GroupedList({
  children,
  variant = 'grouped',
  fit,
}: GroupedListProps): React.JSX.Element {
  return (
    <FieldLayout value={listLayout(fit, variant)}>
      <GroupScroll fit={fit} variant={variant}>
        {children}
      </GroupScroll>
    </FieldLayout>
  );
}

function GroupScroll(
  props: Pick<GroupedListProps, 'children' | 'variant' | 'fit'>,
): React.JSX.Element {
  const { children, fit, variant } = props;
  // Wide, the group pads none of its own, so the pane's column is all its side padding.
  const columnStyle = useScrollColumnStyle();

  return (
    <ScrollView
      className={fit ? 'shrink' : 'flex-1'}
      contentContainerStyle={columnStyle}
      contentContainerClassName={groupClasses(fit, variant)}
    >
      <ScrollColumnContext value={undefined}>{children}</ScrollColumnContext>
    </ScrollView>
  );
}

function groupClasses(
  fit: boolean | undefined,
  variant: GroupedListProps['variant'],
): string {
  return cn(groupSpacing(fit), variant === 'sidebar' && 'px-0');
}

function groupSpacing(fit: boolean | undefined): string {
  return fit
    ? 'gap-4 p-4 wide:gap-2 wide:p-1'
    : cn(groupedListGap, groupedListPadding);
}

GroupedList satisfies React.ComponentType<GroupedListProps>;

function listLayout(
  fit: GroupedListProps['fit'],
  variant: GroupedListProps['variant'],
): React.ContextType<typeof FieldLayout> {
  return fit && variant === 'grouped' ? 'overlay' : variant;
}
