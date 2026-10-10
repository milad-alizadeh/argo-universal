import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, type StyleProp, View, type ViewStyle } from 'react-native';
import type { ButtonProps } from '#primitives/button';

export interface ComposerSheetProps {
  style?: StyleProp<ViewStyle>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called once the sheet has left the screen after closing.
  onClosed: () => void;
  trigger: ReactElement<ButtonProps>;
  label: string;
  children: ReactNode;
}

export function ComposerSheet({
  style,
  open,
  onOpenChange,
  onClosed,
  trigger,
  label,
  children,
}: ComposerSheetProps): React.JSX.Element {
  return (
    <DialogPrimitive.Root style={style} open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild disabled={trigger.props.disabled}>
        {trigger}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-state={open ? 'open' : 'closed'}
          className="composer-sheet-overlay absolute inset-0 bg-black/20"
        />
        <DialogPrimitive.Content
          data-state={open ? 'open' : 'closed'}
          aria-describedby={undefined}
          onCloseAutoFocus={onClosed}
          className="composer-sheet max-h-[85vh] rounded-t-xl bg-popover pb-8.5 shadow-sheet outline-none"
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
