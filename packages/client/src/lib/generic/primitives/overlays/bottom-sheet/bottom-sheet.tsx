import {
  BottomSheet as ExpoBottomSheet,
  Group,
  RNHostView,
} from '@expo/ui/swift-ui';
import {
  type ModifierConfig,
  interactiveDismissDisabled,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from '../../native/host';
import { RoutedFormSheet } from '../form-sheet/form-sheet';
import { useFormSheetCommands } from '../form-sheet/form-sheet-context';
import { BottomSheetContent } from './bottom-sheet-content';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  const commands = useFormSheetCommands();
  if (commands && props.size === 'form')
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
  | 'contentScrolls'
  | 'surface'
>;

function SheetContent(props: SheetContentProps): React.JSX.Element {
  const colors = useNativeTheme().colors;
  const modifiers = [
    ...sheetDetents(props.fit),
    presentationDragIndicator('visible'),
    interactiveDismissDisabled(props.dismissible === false),
    ...sheetFill(props.surface === 'sidebar' ? colors.sidebar : colors.popover),
  ];
  return (
    <Group modifiers={modifiers}>
      <RNHostView matchContents={props.fit}>
        <SheetWidth fit={props.fit}>
          <BottomSheetContent {...props} />
        </SheetWidth>
      </RNHostView>
    </Group>
  );
}

// A fitted sheet takes its height from the content, so only a fixed one names detents.
function sheetDetents(fit: boolean | undefined): ModifierConfig[] {
  return fit ? [] : [presentationDetents([{ height: 320 }, 'medium', 'large'])];
}

// The sheet's own fill matches the content's, so the strip under it in the safe area is not grey.
function sheetFill(popover: string | undefined): ModifierConfig[] {
  return popover === undefined ? [] : [presentationBackground(popover)];
}

// A fitted sheet measures its content with no width to go by, so the content takes the screen's.
function SheetWidth(props: {
  fit: boolean | undefined;
  children: React.ReactElement;
}): React.JSX.Element {
  const { width } = useWindowDimensions();
  if (!props.fit) return props.children;
  return <View style={{ width }}>{props.children}</View>;
}

function dismissPresentation(
  props: Pick<BottomSheetProps, 'onOpenChange' | 'onClosed'>,
): void {
  props.onOpenChange(false);
  props.onClosed?.();
}
