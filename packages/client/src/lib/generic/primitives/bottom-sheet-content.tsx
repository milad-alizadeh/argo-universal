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
  return (
    <View
      className={cn('bg-popover ios:pt-4 pb-8', !props.fit && 'flex-1')}
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
