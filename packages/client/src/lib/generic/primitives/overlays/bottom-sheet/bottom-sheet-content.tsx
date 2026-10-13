import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { BottomSheetProps } from './bottom-sheet.types';

type SheetContentProps = Pick<
  BottomSheetProps,
  | 'children'
  | 'label'
  | 'onOpenChange'
  | 'fit'
  | 'dismissible'
  | 'contentScrolls'
  | 'surface'
> & { onContentHeightChange?: (height: number) => void };

const grabberInset = 32;

export function BottomSheetContent(
  props: SheetContentProps,
): React.JSX.Element {
  // On iOS the content starts below the grabber's zone, and the sheet's own safe area is its bottom edge.
  return (
    <View className={sheetClass(props)} {...sheetAccessibility(props)}>
      {props.contentScrolls ? (
        props.children
      ) : (
        <ScrollView {...scrollProps(props)}>{props.children}</ScrollView>
      )}
    </View>
  );
}

function scrollProps(
  props: Pick<SheetContentProps, 'onContentHeightChange'>,
): React.ComponentProps<typeof ScrollView> {
  return {
    keyboardShouldPersistTaps: 'handled',
    automaticallyAdjustKeyboardInsets: true,
    onContentSizeChange: (_width, height): void =>
      props.onContentHeightChange?.(height + grabberInset),
  };
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

function sheetClass(props: Pick<SheetContentProps, 'surface' | 'fit'>): string {
  return cn(
    props.surface === 'sidebar' ? 'bg-sidebar' : 'bg-popover',
    'ios:pt-8 pb-8 ios:pb-0',
    !props.fit && 'flex-1',
  );
}
