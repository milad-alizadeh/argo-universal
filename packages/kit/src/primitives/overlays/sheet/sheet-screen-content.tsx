import type { ReactElement } from 'react';
import { ScrollView } from 'react-native';
import { SheetInset } from './sheet-inset';
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
    <SheetInset inset={props.inset} className="min-h-0 shrink">
      {props.children}
    </SheetInset>
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
      <SheetInset inset={props.inset}>{props.children}</SheetInset>
    </ScrollView>
  );
}
