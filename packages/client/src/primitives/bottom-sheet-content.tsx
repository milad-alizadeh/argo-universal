import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheetContent({
  children,
  label,
  onOpenChange,
}: Pick<
  BottomSheetProps,
  'children' | 'label' | 'onOpenChange'
>): React.JSX.Element {
  return (
    <View
      className="flex-1 bg-popover ios:pt-4 pb-8"
      role="dialog"
      accessibilityLabel={label}
      accessibilityViewIsModal
      onAccessibilityEscape={() => onOpenChange(false)}
    >
      <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View>
  );
}
