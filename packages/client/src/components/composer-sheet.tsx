import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import type { ComposerSheetProps } from './composer-sheet-layout';

export type { ComposerSheetProps } from './composer-sheet-layout';

export function ComposerSheet({
  style,
  open,
  onOpenChange,
  onClosed,
  trigger,
  label,
  children,
}: ComposerSheetProps): React.JSX.Element {
  useEffect(() => {
    if (!open) onClosed();
  }, [open, onClosed]);
  return (
    <DialogPrimitive.Root style={style} open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild disabled={trigger.props.disabled}>
        {trigger}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="web:fixed absolute inset-0 z-50 bg-black/20" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="web:fixed absolute bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-xl bg-popover pb-8.5 shadow-sheet outline-none"
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
