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
}: FieldGroupProps): React.JSX.Element {
  // Wide, the group pads none of its own, so the pane's column is all its side padding.
  const columnStyle = useScrollColumnStyle();
  return (
    <FieldLayout value={variant}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={columnStyle}
        contentContainerClassName={cn(
          fieldGroupGap,
          fieldGroupPadding,
          // A navigation list's rows span a phone's width, as a native plain list's do.
          variant === 'navigation' && 'px-0',
        )}
      >
        <ScrollColumnContext value={undefined}>{children}</ScrollColumnContext>
      </ScrollView>
    </FieldLayout>
  );
}
