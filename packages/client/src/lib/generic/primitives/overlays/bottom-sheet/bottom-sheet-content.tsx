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
  | 'footer'
  | 'contentScrolls'
  | 'surface'
>;

export function BottomSheetContent(
  props: SheetContentProps,
): React.JSX.Element {
  return (
    <View className={sheetClass(props)} {...sheetAccessibility(props)}>
      {props.contentScrolls ? (
        props.children
      ) : (
        <ScrollView
          className={cn('shrink min-h-0', !props.fit && 'flex-1')}
          keyboardShouldPersistTaps="handled"
          role="region"
          accessibilityLabel={`${props.label ?? 'Sheet'} document`}
        >
          {props.children}
        </ScrollView>
      )}
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

function sheetClass(props: Pick<SheetContentProps, 'surface' | 'fit'>): string {
  return cn(
    props.surface === 'sidebar' ? 'bg-sidebar' : 'bg-popover',
    'ios:pt-8 pb-8 ios:pb-0 min-h-0',
    !props.fit && 'flex-1',
  );
}
