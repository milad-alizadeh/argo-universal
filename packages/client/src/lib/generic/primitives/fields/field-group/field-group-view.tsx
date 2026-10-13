import type * as React from 'react';
import { ScrollView } from 'react-native';
import {
  ScrollColumnContext,
  useScrollColumnStyle,
} from '../../../scroll-column';
import { cn } from '../../../utils';
import { FieldLayout, fieldGroupGap, fieldGroupPadding } from '../field-layout';
import type { FieldGroupProps } from '../field-props';

export function FieldGroup({
  children,
  variant = 'grouped',
  fit,
}: FieldGroupProps): React.JSX.Element {
  return (
    <FieldLayout value={variant}>
      <GroupScroll fit={fit} variant={variant}>
        {children}
      </GroupScroll>
    </FieldLayout>
  );
}

function GroupScroll(
  props: Pick<FieldGroupProps, 'children' | 'variant' | 'fit'>,
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
  variant: FieldGroupProps['variant'],
): string {
  return cn(groupSpacing(fit), variant === 'navigation' && 'px-0');
}

function groupSpacing(fit: boolean | undefined): string {
  return fit ? 'gap-4 p-4 wide:p-0' : cn(fieldGroupGap, fieldGroupPadding);
}
