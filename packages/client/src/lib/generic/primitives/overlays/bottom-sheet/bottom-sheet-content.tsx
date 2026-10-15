import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '#lib/generic/utils';
import { GroupedPageContext } from '#primitives/lists/grouped-list';
import { pageSurface, sheetSurfaceStyle } from '#primitives/native/surface';
import type { BottomSheetProps } from './bottom-sheet-props';

type SheetContentProps = Pick<
  BottomSheetProps,
  | 'children'
  | 'label'
  | 'onOpenChange'
  | 'fit'
  | 'dismissible'
  | 'footer'
  | 'contentScrolls'
> & {
  viewportHeight?: number;
  onContentHeightChange?: (height: number) => void;
};

const grabberInset = 32;

function noGroupedPage(): void {}

export function BottomSheetContent(
  props: SheetContentProps,
): React.JSX.Element {
  return (
    <View
      style={[sheetSurfaceStyle, { height: props.viewportHeight }]}
      className={sheetClass(props)}
      {...sheetAccessibility(props)}
    >
      <SheetPage {...props} />
    </View>
  );
}

// The sheet draws its own background, so a grouped list in it leaves the screen beneath alone.
function SheetPage(props: SheetContentProps): React.JSX.Element {
  return (
    <GroupedPageContext value={noGroupedPage}>
      <SheetBody {...props} />
      {props.footer}
    </GroupedPageContext>
  );
}

function SheetBody(props: SheetContentProps): React.ReactNode {
  const { bottom } = useSafeAreaInsets();

  if (props.contentScrolls) return props.children;

  return (
    <ScrollView
      className={cn('shrink min-h-0', { 'flex-1': !props.fit })}
      {...scrollProps(props, bottom)}
    >
      {props.children}
    </ScrollView>
  );
}

function scrollProps(
  props: SheetContentProps,
  bottomInset: number,
): React.ComponentProps<typeof ScrollView> {
  return {
    keyboardShouldPersistTaps: 'handled',
    automaticallyAdjustKeyboardInsets: !props.footer,
    // The sheet's whole height: the grabber above and the bottom safe area below the rows.
    onContentSizeChange: (_width, height) =>
      props.onContentHeightChange?.(height + grabberInset + bottomInset),
    role: 'region',
    accessibilityLabel: `${props.label ?? 'Sheet'} document`,
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

function sheetClass(props: SheetContentProps): string {
  return cn(
    pageSurface,
    'ios:pt-8 ios:pb-0 min-h-0',
    fitSheetPadding(props.fit),
    {
      'pb-8': !props.footer,
      'flex-1': !props.fit && props.viewportHeight === undefined,
    },
  );
}

function fitSheetPadding(fit: boolean | undefined): string | undefined {
  return fit ? 'android:pb-0' : undefined;
}
