// Stock SwiftUI sheet: universal BottomSheet has no detent selection (initialSize) and no after-dismiss onClosed.
import {
  BottomSheet as ExpoBottomSheet,
  Group,
  RNHostView,
} from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  type PresentationDetent,
  interactiveDismissDisabled,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { Host } from '#primitives/native/host';
import { BottomSheetContent } from './bottom-sheet-content';
import type { BottomSheetProps } from './bottom-sheet-props';
import { BottomSheetRoot } from './bottom-sheet-root.native';
import { BottomSheetTrigger } from './bottom-sheet-trigger.native';
import { SheetViewport } from './bottom-sheet-viewport';
import { RoutedFormSheet } from './form-sheet';
import { useFormSheetCommands } from './form-sheet-context';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  const commands = useFormSheetCommands();

  if (commands && props.variant === 'form')
    return <RoutedFormSheet {...props} commands={commands} />;

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
>;

function SheetContent(props: SheetContentProps): React.JSX.Element {
  return (
    <Group modifiers={useSheetModifiers(props)}>
      <SheetViewport fit={props.fit}>
        {(viewportHeight) => (
          <BottomSheetContent {...props} viewportHeight={viewportHeight} />
        )}
      </SheetViewport>
    </Group>
  );
}

function useSheetModifiers(props: SheetContentProps): ModifierConfig[] {
  return [
    ...useSheetDetents(props),
    presentationDragIndicator('visible'),
    interactiveDismissDisabled(props.dismissible === false),
  ];
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

function dismissPresentation(
  props: Pick<BottomSheetProps, 'onOpenChange' | 'onClosed'>,
): void {
  props.onOpenChange(false);
  props.onClosed?.();
}

BottomSheet satisfies React.ComponentType<BottomSheetProps>;
