import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { BottomSheetProps } from './bottom-sheet.types';

type SheetContentProps = Pick<
  BottomSheetProps,
  'children' | 'label' | 'onOpenChange' | 'fit'
>;

export function BottomSheetContent(
  props: SheetContentProps,
): React.JSX.Element {
  // On iOS the content starts below the grabber's zone, and the sheet's own safe area is its bottom edge.
  return (
    <View
      className={cn(
        'bg-popover ios:pt-8 pb-8 ios:pb-0',
        !props.fit && 'flex-1',
      )}
      {...sheetAccessibility(props)}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {props.children}
      </ScrollView>
    </View>
  );
}

function sheetAccessibility(
  props: Pick<SheetContentProps, 'label' | 'onOpenChange'>,
): React.ComponentProps<typeof View> {
  return {
    role: 'dialog',
    accessibilityLabel: props.label,
    accessibilityViewIsModal: true,
    onAccessibilityEscape: (): void => props.onOpenChange(false),
  };
}
