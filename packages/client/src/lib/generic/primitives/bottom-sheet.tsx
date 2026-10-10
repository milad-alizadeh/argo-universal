import {
  BottomSheet as ExpoBottomSheet,
  Group,
  Host,
  RNHostView,
} from '@expo/ui/swift-ui';
import {
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { BottomSheetContent } from './bottom-sheet-content';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
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
    onIsPresentedChange: props.onOpenChange,
    onDismiss: () => dismissPresentation(props),
    anchor: (
      <RNHostView matchContents>
        <BottomSheetTrigger trigger={props.trigger} />
      </RNHostView>
    ),
  };
}

function SheetContent(
  props: Pick<BottomSheetProps, 'children' | 'label' | 'onOpenChange'>,
): React.JSX.Element {
  const modifiers = [
    presentationDetents([{ height: 320 }, 'medium', 'large']),
    presentationDragIndicator('visible'),
  ];
  return (
    <Group modifiers={modifiers}>
      <RNHostView>
        <BottomSheetContent {...props} />
      </RNHostView>
    </Group>
  );
}

function dismissPresentation(
  props: Pick<BottomSheetProps, 'onOpenChange' | 'onClosed'>,
): void {
  props.onOpenChange(false);
  props.onClosed?.();
}
