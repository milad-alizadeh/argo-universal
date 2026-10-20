import type { ReactElement, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '#lib/generic/utils';
import { sheetInsetClass } from './sheet-inset';
import type { SheetProps } from './sheet-props';

type BodyProps = Pick<
  SheetProps,
  | 'label'
  | 'footer'
  | 'contentScrolls'
  | 'dismissible'
  | 'onOpenChange'
  | 'inset'
> & {
  // The page fills the sheet's height, as a sheet with detents gives it.
  fill: boolean;
  children: ReactNode;
};

/*
 * A phone sheet's React Native content: the page, scrolled unless it scrolls itself, and the footer
 * under it. Both systems lay a sheet over the home indicator and the gesture bar, so the body holds
 * everything it draws clear of them rather than letting its last row run under one.
 */
export function SheetBody(props: BodyProps): ReactElement {
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      className={cn(props.fill && 'flex-1')}
      style={{ paddingBottom: bottom }}
      accessibilityLabel={props.label}
      accessibilityViewIsModal
      onAccessibilityEscape={() => escape(props)}
    >
      <PageContent {...props} />
      {props.footer}
    </View>
  );
}

function escape(props: Pick<BodyProps, 'dismissible' | 'onOpenChange'>): void {
  if (props.dismissible !== false) props.onOpenChange(false);
}

// A page that scrolls itself, such as a long list, gets no second scroller around it.
function PageContent(props: BodyProps): ReactElement {
  if (!props.contentScrolls) return <PageScroll {...props} />;

  return (
    <View className={cn(sheetInsetClass(props.inset), props.fill && 'flex-1')}>
      {props.children}
    </View>
  );
}

function PageScroll(props: BodyProps): ReactElement {
  return (
    <ScrollView
      className={cn('min-h-0 shrink', props.fill && 'flex-1')}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={!props.footer}
    >
      <View className={sheetInsetClass(props.inset)}>{props.children}</View>
    </ScrollView>
  );
}
