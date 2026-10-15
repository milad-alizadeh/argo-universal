import {
  BottomSheet as ExpoBottomSheet,
  Group,
  RNHostView,
} from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  interactiveDismissDisabled,
  presentationBackground,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { type ColorValue, type LayoutChangeEvent, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { useNativeTheme } from '#lib/generic/native-theme';
import { groupedBackground } from '#primitives/native/grouped-background';
import { Host } from '#primitives/native/host';
import { BottomSheetContent } from './bottom-sheet-content';
import { useSheetDetents } from './bottom-sheet-detents';
import type { BottomSheetProps } from './bottom-sheet-props';
import { BottomSheetRoot } from './bottom-sheet-root.native';
import { BottomSheetTrigger } from './bottom-sheet-trigger.native';
import { SheetViewport } from './bottom-sheet-viewport';
import { RoutedFormSheet } from './form-sheet';
import { useFormSheetCommands } from './form-sheet-context';
import { SheetListProvider } from './sheet-list-context';
import { useSheetListFit } from './sheet-list-fit';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  const commands = useFormSheetCommands();
  const [anchorWidth, onRootLayout] = useAnchorWidth();

  if (commands && props.variant === 'form')
    return <RoutedFormSheet {...props} commands={commands} />;

  return (
    <BottomSheetRoot {...props} onLayout={onRootLayout}>
      <Host matchContents>
        <ExpoBottomSheet {...presentationProps(props, anchorWidth)}>
          <SheetContent {...props} />
        </ExpoBottomSheet>
      </Host>
    </BottomSheetRoot>
  );
}

/*
 * A hosted trigger is measured with no width to go by but its own maximum, so it would take its
 * full label's width and overflow its column. Capped at the width the sheet's place in the layout
 * gives it, its label truncates instead.
 */
function useAnchorWidth(): [
  number | undefined,
  (event: LayoutChangeEvent) => void,
] {
  const [width, setWidth] = useState<number>();

  return [width, (event) => setWidth(event.nativeEvent.layout.width)];
}

function presentationProps(
  props: BottomSheetProps,
  anchorWidth: number | undefined,
): Omit<React.ComponentProps<typeof ExpoBottomSheet>, 'children'> {
  return {
    isPresented: props.open,
    fitToContents: props.fit,
    onIsPresentedChange: props.onOpenChange,
    onDismiss: () => dismissPresentation(props),
    anchor: props.trigger && (
      <SheetAnchor trigger={props.trigger} width={anchorWidth} />
    ),
  };
}

function SheetAnchor(props: {
  trigger: NonNullable<BottomSheetProps['trigger']>;
  width: number | undefined;
}): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View style={{ maxWidth: props.width }}>
        <BottomSheetTrigger trigger={props.trigger} />
      </View>
    </RNHostView>
  );
}

type SheetContentProps = Pick<
  BottomSheetProps,
  | 'children'
  | 'label'
  | 'onOpenChange'
  | 'fit'
  | 'fitList'
  | 'dismissible'
  | 'footer'
  | 'initialSize'
  | 'contentScrolls'
  | 'surface'
>;

function SheetContent(props: SheetContentProps): React.JSX.Element {
  const fit = useSheetListFit(props.fitList);

  return (
    <Group modifiers={useSheetModifiers(props, fit.height)}>
      <SheetViewport fit={props.fit}>
        {(viewportHeight) => (
          <SheetListProvider value={fit.list(viewportHeight)}>
            <BottomSheetContent {...props} viewportHeight={viewportHeight} />
          </SheetListProvider>
        )}
      </SheetViewport>
    </Group>
  );
}

function useSheetModifiers(
  props: SheetContentProps,
  listHeight: number | undefined,
): ModifierConfig[] {
  const { content } = useNativeTheme().colors;
  const glass = useResolveClassNames('bg-card/80').backgroundColor;

  return [
    ...useSheetDetents(props, listHeight),
    presentationDragIndicator('visible'),
    interactiveDismissDisabled(props.dismissible === false),
    ...sheetFill(surfaceFill(props.surface, { content, glass })),
  ];
}

function surfaceFill(
  surface: BottomSheetProps['surface'],
  fills: { content: ColorValue | undefined; glass: ColorValue | undefined },
): ColorValue | undefined {
  if (surface === 'grouped') return groupedBackground;

  return surface === 'sidebar' ? fills.content : fills.glass;
}

/*
 * The sheet's own fill, so the strip under the content in the safe area matches it. A card sheet
 * is Paper's translucent card, which its content lets show through.
 */
function sheetFill(fill: ColorValue | undefined): ModifierConfig[] {
  return fill === undefined ? [] : [presentationBackground(fill)];
}

function dismissPresentation(
  props: Pick<BottomSheetProps, 'onOpenChange' | 'onClosed'>,
): void {
  props.onOpenChange(false);
  props.onClosed?.();
}

BottomSheet satisfies React.ComponentType<BottomSheetProps>;
