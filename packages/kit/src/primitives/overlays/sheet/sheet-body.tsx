import type { ReactElement, ReactNode } from 'react';
import { Platform, ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollEndGapContext } from '#kit/scroll-surface';
import { cn } from '#kit/utils';
import { isDismissible } from './sheet-dismissible';
import { sheetInsetClass } from './sheet-inset';
import type { SheetProps } from './sheet-props';
import { ReactContent } from './sheet-react-content';

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
 * A phone sheet's React Native content: the page, scrolled unless it scrolls itself, and the footer under
 * it. Both systems lay a sheet over the home indicator and the gesture bar, so the body holds its last row
 * clear of them — at the end of what scrolls, so the page still fills the sheet to its edge, and as padding
 * only under a footer, which sits below the scroller and cannot scroll clear of one (owner, 2026-10-20).
 */
export function SheetBody(props: BodyProps): ReactElement {
  const gap = useBottomGap(props);

  return (
    <ReactContent>
      <ScrollEndGapContext value={gap.scrolled}>
        <View {...bodyProps(props)} style={gap.padded}>
          <ScreenContent {...props} gap={gap.scrolled} />
          {props.footer}
        </View>
      </ScrollEndGapContext>
    </ReactContent>
  );
}

interface BottomGap {
  // The clear space the scrolled content ends on, so the page still fills the sheet to its edge.
  scrolled: number;
  // A footer sits below the scroller and cannot scroll clear of the bar, so it is padded instead.
  padded?: { paddingBottom: number };
}

/*
 * Material's ModalBottomSheet already holds its content inside the system bars, so an Android sheet that
 * added the inset again would stop its last row two gesture bars above the screen. Only iOS lays its sheet
 * over the home indicator, so only iOS asks for the clear space (owner, 2026-10-20).
 */
function useBottomGap(props: Pick<BodyProps, 'footer'>): BottomGap {
  const { bottom } = useSafeAreaInsets();
  const clear = Platform.OS === 'android' ? 0 : bottom;

  if (props.footer) return { scrolled: 0, padded: { paddingBottom: clear } };

  return { scrolled: clear };
}

function bodyProps(props: BodyProps): Omit<ViewProps, 'style'> {
  return {
    className: cn(props.fill && 'flex-1'),
    accessibilityLabel: props.label,
    accessibilityViewIsModal: true,
    onAccessibilityEscape: () => escape(props),
  };
}

function escape(props: Pick<BodyProps, 'dismissible' | 'onOpenChange'>): void {
  if (isDismissible(props.dismissible)) props.onOpenChange(false);
}

// A page that scrolls itself, such as a long list, gets no second scroller around it.
function ScreenContent(props: BodyProps & { gap: number }): ReactElement {
  if (!props.contentScrolls) return <ScreenScroll {...props} />;

  return (
    <View className={cn(sheetInsetClass(props.inset), props.fill && 'flex-1')}>
      {props.children}
    </View>
  );
}

// The sheet's own scroller ends on the gap, as a List it wraps would.
function ScreenScroll(props: BodyProps & { gap: number }): ReactElement {
  return (
    <ScrollView
      className={cn('min-h-0 shrink', props.fill && 'flex-1')}
      contentContainerStyle={{ paddingBottom: props.gap }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={!props.footer}
      nestedScrollEnabled
    >
      <View className={sheetInsetClass(props.inset)}>{props.children}</View>
    </ScrollView>
  );
}
