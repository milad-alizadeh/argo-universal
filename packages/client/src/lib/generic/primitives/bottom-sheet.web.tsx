import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BottomSheetRoot } from './bottom-sheet-root';
import { BottomSheetTrigger } from './bottom-sheet-trigger';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheet(props: BottomSheetProps): React.JSX.Element {
  return (
    <BottomSheetRoot {...props}>
      <BottomSheetTrigger trigger={props.trigger} />
      <SheetPortal {...props} />
    </BottomSheetRoot>
  );
}

function SheetPortal(
  props: Pick<BottomSheetProps, 'open' | 'onClosed' | 'label' | 'children'>,
): React.JSX.Element {
  const state = props.open ? 'open' : 'closed';
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-state={state}
        className="bottom-sheet-overlay absolute inset-0 bg-black/20"
      />
      {sheetDialog(props)}
    </DialogPrimitive.Portal>
  );
}

function SheetBody({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { tallest, onLayout } = useTallestHeight();
  return (
    <View style={{ minHeight: tallest }} className="shrink" onLayout={onLayout}>
      <SheetGrip />
      <ScrollView>{children}</ScrollView>
    </View>
  );
}

function SheetGrip(): React.JSX.Element {
  return (
    <View className="items-center pt-1.5 pb-2">
      <View className="w-9 h-1.25 rounded-full bg-muted-foreground/40" />
    </View>
  );
}

function sheetDialog(
  props: Pick<BottomSheetProps, 'open' | 'onClosed' | 'label' | 'children'>,
): React.JSX.Element {
  return (
    <DialogPrimitive.Content {...sheetContentProps(props)}>
      <DialogPrimitive.Title className="sr-only">
        {props.label}
      </DialogPrimitive.Title>
      <SheetBody>{props.children}</SheetBody>
    </DialogPrimitive.Content>
  );
}

function useTallestHeight(): {
  tallest: number;
  onLayout: React.ComponentProps<typeof View>['onLayout'];
} {
  const [tallest, setTallest] = useState(0);
  const onLayout: React.ComponentProps<typeof View>['onLayout'] = (event) => {
    const { height } = event.nativeEvent.layout;
    setTallest((previous) => Math.max(previous, height));
  };
  return { tallest, onLayout };
}

function sheetContentProps(
  props: Pick<BottomSheetProps, 'open' | 'onClosed'>,
): React.ComponentProps<typeof DialogPrimitive.Content> & {
  'data-state': string;
  'aria-describedby': undefined;
} {
  return {
    'data-state': props.open ? 'open' : 'closed',
    'aria-describedby': undefined,
    onCloseAutoFocus: props.onClosed,
    className:
      'bottom-sheet max-h-[85vh] rounded-t-surface bg-popover pb-8.5 shadow-card dark:border dark:border-border outline-none',
  };
}
