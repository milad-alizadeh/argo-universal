import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import type { BottomSheetProps } from './bottom-sheet.types';

export function BottomSheet({
  style,
  open,
  onOpenChange,
  onClosed,
  trigger,
  label,
  children,
}: BottomSheetProps): React.JSX.Element {
  return (
    <DialogPrimitive.Root style={style} open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild disabled={!!trigger.props.disabled}>
        {trigger}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-state={open ? 'open' : 'closed'}
          className="bottom-sheet-overlay absolute inset-0 bg-black/20"
        />
        <DialogPrimitive.Content
          data-state={open ? 'open' : 'closed'}
          aria-describedby={undefined}
          onCloseAutoFocus={onClosed}
          className="bottom-sheet max-h-[85vh] rounded-t-xl bg-popover pb-8.5 shadow-sheet outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            {label}
          </DialogPrimitive.Title>
          <View className="items-center pt-1.5 pb-2">
            <View className="w-9 h-1.25 rounded-full bg-muted-foreground/40" />
          </View>
          <ScrollView>{children}</ScrollView>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
