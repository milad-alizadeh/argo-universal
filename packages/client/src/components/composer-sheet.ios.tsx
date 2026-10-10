import { BottomSheet, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import { presentationDragIndicator } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { cloneElement } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComposerSheetProps } from './composer-sheet';

const minimumBottomPadding = 16;

// The system sheet, sized to its content.
export function ComposerSheet({
  style,
  open,
  onOpenChange,
  onClosed,
  trigger,
  label,
  children,
}: ComposerSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View style={style}>
      {cloneElement(trigger, { onPress: () => onOpenChange(true) })}
      <Host matchContents style={{ position: 'absolute' }}>
        <BottomSheet
          isPresented={open}
          onIsPresentedChange={onOpenChange}
          // iOS presents a picker on the top view controller, so report closing once the sheet has gone.
          onDismiss={onClosed}
          fitToContents
        >
          <Group modifiers={[presentationDragIndicator('visible')]}>
            <RNHostView matchContents>
              <View
                accessibilityLabel={label}
                accessibilityViewIsModal
                className="pt-4"
                style={{
                  paddingBottom: Math.max(minimumBottomPadding, insets.bottom),
                }}
              >
                {children}
              </View>
            </RNHostView>
          </Group>
        </BottomSheet>
      </Host>
    </View>
  );
}
