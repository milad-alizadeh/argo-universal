import type { ReactElement } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#kit/utils';
import { sheetInsetClass } from './sheet-inset';
import type { SheetProps } from './sheet-props';

export type SheetScreenContentProps = Pick<
  SheetProps,
  'label' | 'inset' | 'children' | 'contentScrolls'
>;

// A page that owns its scroller fills the sheet without a second scroller around its header.
export function SheetScreenContent(
  props: SheetScreenContentProps,
): ReactElement {
  return props.contentScrolls ? (
    <View className={cn('min-h-0 shrink', sheetInsetClass(props.inset))}>
      {props.children}
    </View>
  ) : (
    <ScreenScroll {...props} />
  );
}

function ScreenScroll(props: SheetScreenContentProps): ReactElement {
  return (
    <ScrollView
      className="min-h-0 shrink"
      keyboardShouldPersistTaps="handled"
      role="region"
      accessibilityLabel={props.label}
    >
      <View className={sheetInsetClass(props.inset)}>{props.children}</View>
    </ScrollView>
  );
}
