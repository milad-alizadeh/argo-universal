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
import * as DialogPrimitive from '@rn-primitives/dialog';
import type * as React from 'react';
import { BottomSheetContent } from './bottom-sheet-content';
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
      <Host matchContents>
        <ExpoBottomSheet
          isPresented={open}
          onIsPresentedChange={onOpenChange}
          onDismiss={() => {
            onOpenChange(false);
            onClosed?.();
          }}
          anchor={
            <RNHostView matchContents>
              <DialogPrimitive.Trigger
                asChild
                disabled={!!trigger.props.disabled}
              >
                {trigger}
              </DialogPrimitive.Trigger>
            </RNHostView>
          }
        >
          <Group
            modifiers={[
              presentationDetents([{ height: 320 }, 'medium', 'large']),
              presentationDragIndicator('visible'),
            ]}
          >
            <RNHostView>
              <BottomSheetContent label={label} onOpenChange={onOpenChange}>
                {children}
              </BottomSheetContent>
            </RNHostView>
          </Group>
        </ExpoBottomSheet>
      </Host>
    </DialogPrimitive.Root>
  );
}
