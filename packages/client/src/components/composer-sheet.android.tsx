import { Host, ModalBottomSheet, RNHostView } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { cloneElement, useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComposerSheetProps } from './composer-sheet';

const minimumBottomPadding = 16;

// The Material sheet, sized to its content.
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
  useEffect(() => {
    if (!open) onClosed();
  }, [open, onClosed]);
  return (
    <View style={style}>
      {cloneElement(trigger, { onPress: () => onOpenChange(true) })}
      {open && (
        <Host matchContents style={{ position: 'absolute' }}>
          <ModalBottomSheet
            onDismissRequest={() => onOpenChange(false)}
            skipPartiallyExpanded
            showDragHandle
          >
            <RNHostView matchContents>
              <View
                accessibilityLabel={label}
                style={{
                  paddingBottom: Math.max(minimumBottomPadding, insets.bottom),
                }}
              >
                {children}
              </View>
            </RNHostView>
          </ModalBottomSheet>
        </Host>
      )}
    </View>
  );
}
