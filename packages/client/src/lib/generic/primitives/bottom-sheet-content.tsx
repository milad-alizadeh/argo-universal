import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import type { BottomSheetProps } from './bottom-sheet.types';

type SheetContentProps = Pick<
  BottomSheetProps,
  'children' | 'label' | 'onOpenChange'
>;

export function BottomSheetContent(
  props: SheetContentProps,
): React.JSX.Element {
  return (
    <View
      className="flex-1 bg-popover ios:pt-4 pb-8"
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
