import {
  BottomSheet as ExpoBottomSheet,
  Group,
  RNHostView,
} from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  type PresentationDetent,
  interactiveDismissDisabled,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '../../native/host';
import { BottomSheetContent } from './bottom-sheet-content';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import { SheetViewport } from './bottom-sheet-viewport';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  return (
    <BottomSheetRoot {...props}>
      <Host matchContents>
        <ExpoBottomSheet {...presentationProps(props)}>
          <SheetContent {...props} />
        </ExpoBottomSheet>
      </Host>
    </BottomSheetRoot>
  );
}

function presentationProps(
  props: BottomSheetProps,
): Omit<React.ComponentProps<typeof ExpoBottomSheet>, 'children'> {
  return {
    isPresented: props.open,
    fitToContents: props.fit,
    onIsPresentedChange: props.onOpenChange,
    onDismiss: () => dismissPresentation(props),
    anchor: props.trigger && (
      <RNHostView matchContents>
        <BottomSheetTrigger trigger={props.trigger} />
      </RNHostView>
    ),
  };
}

type SheetContentProps = Pick<
  BottomSheetProps,
  | 'children'
  | 'label'
  | 'onOpenChange'
  | 'fit'
  | 'dismissible'
  | 'footer'
  | 'initialSize'
  | 'contentScrolls'
  | 'surface'
>;

function SheetContent(props: SheetContentProps): React.JSX.Element {
  const colors = useNativeTheme().colors;
  const modifiers = [
    ...useSheetDetents(props),
    presentationDragIndicator('visible'),
    interactiveDismissDisabled(props.dismissible === false),
    ...sheetFill(props.surface === 'sidebar' ? colors.sidebar : colors.popover),
  ];
  return (
    <Group modifiers={modifiers}>
      <SheetViewport fit={props.fit}>
        {(viewportHeight) => (
          <BottomSheetContent {...props} viewportHeight={viewportHeight} />
        )}
      </SheetViewport>
    </Group>
  );
}

// A fitted sheet takes its height from the content, so only a fixed one names detents.
function useSheetDetents(
  props: Pick<BottomSheetProps, 'fit' | 'initialSize'>,
): ModifierConfig[] {
  const [selection, setSelection] = useState<PresentationDetent>(
    initialDetent(props.initialSize),
  );
  return props.fit
    ? []
    : [
        presentationDetents([{ height: 320 }, 'medium', 'large'], {
          selection,
          onSelectionChange: setSelection,
        }),
      ];
}

function initialDetent(
  size: BottomSheetProps['initialSize'],
): PresentationDetent {
  if (size === 'expanded') return 'large';
  return size === 'medium' ? 'medium' : { height: 320 };
}

// The sheet's own fill matches the content's, so the strip under it in the safe area is not grey.
function sheetFill(popover: string | undefined): ModifierConfig[] {
  return popover === undefined ? [] : [presentationBackground(popover)];
}

function dismissPresentation(
  props: Pick<BottomSheetProps, 'onOpenChange' | 'onClosed'>,
): void {
  props.onOpenChange(false);
  props.onClosed?.();
}
