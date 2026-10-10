import { BottomSheet, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import {
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { Dialog, DialogTrigger } from '#primitives/dialog';
import type { ComposerSheetProps } from './composer-sheet';

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
    <Dialog style={style} open={open} onOpenChange={onOpenChange}>
      <Host matchContents>
        <BottomSheet
          isPresented={open}
          onIsPresentedChange={onOpenChange}
          onDismiss={() => {
            onOpenChange(false);
            onClosed();
          }}
          anchor={
            <RNHostView matchContents>
              <DialogTrigger asChild disabled={trigger.props.disabled}>
                {trigger}
              </DialogTrigger>
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
              <View
                className="flex-1 bg-popover pt-4 pb-8"
                role="dialog"
                accessibilityLabel={label}
                accessibilityViewIsModal
                onAccessibilityEscape={() => onOpenChange(false)}
              >
                <ScrollView keyboardShouldPersistTaps="handled">
                  {children}
                </ScrollView>
              </View>
            </RNHostView>
          </Group>
        </BottomSheet>
      </Host>
    </Dialog>
  );
}
