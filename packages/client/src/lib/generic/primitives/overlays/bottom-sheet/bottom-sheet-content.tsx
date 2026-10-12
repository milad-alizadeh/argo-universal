import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { BottomSheetProps } from './bottom-sheet.types';

type SheetContentProps = Pick<
  BottomSheetProps,
  'children' | 'label' | 'onOpenChange' | 'fit' | 'dismissible' | 'footer'
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
      <ScrollView
        className={cn('shrink min-h-0', !props.fit && 'flex-1')}
        keyboardShouldPersistTaps="handled"
        role="region"
        accessibilityLabel={documentLabel(props.label)}
      >
        {props.children}
      </ScrollView>
      {props.footer}
    </View>
  );
}

function sheetAccessibility(
  props: Pick<SheetContentProps, 'label' | 'onOpenChange' | 'dismissible'>,
): React.ComponentProps<typeof View> {
  return {
    role: 'dialog',
    accessibilityLabel: props.label,
    accessibilityViewIsModal: true,
    onAccessibilityEscape: (): void => {
      if (props.dismissible !== false) props.onOpenChange(false);
    },
  };
}

function documentLabel(label: string | undefined): string {
  return `${label ?? 'Sheet'} document`;
}
