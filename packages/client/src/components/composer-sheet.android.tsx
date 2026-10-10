import { Host, ModalBottomSheet, RNHostView } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { cloneElement, useEffect } from 'react';
import { View } from 'react-native';
import {
  type ComposerSheetProps,
  useComposerSheetBottomPadding,
} from './composer-sheet-layout';

// The Material sheet, sized to its content.
export function ComposerSheet(props: ComposerSheetProps): React.JSX.Element {
  const paddingBottom = useComposerSheetBottomPadding();
  const { open, onClosed } = props;
  useEffect(() => {
    if (!open) onClosed();
  }, [open, onClosed]);
  return (
    <View style={props.style}>
      {cloneElement(props.trigger, { onPress: () => props.onOpenChange(true) })}
      {open && (
        <Host matchContents style={{ position: 'absolute' }}>
          <ModalBottomSheet
            onDismissRequest={() => props.onOpenChange(false)}
            skipPartiallyExpanded
            showDragHandle
          >
            <RNHostView matchContents>
              <View accessibilityLabel={props.label} style={{ paddingBottom }}>
                {props.children}
              </View>
            </RNHostView>
          </ModalBottomSheet>
        </Host>
      )}
    </View>
  );
}
