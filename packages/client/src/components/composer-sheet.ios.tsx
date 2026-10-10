import { BottomSheet, Group, Host, RNHostView } from '@expo/ui/swift-ui';
import { presentationDragIndicator } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { cloneElement } from 'react';
import { View } from 'react-native';
import {
  type ComposerSheetProps,
  useComposerSheetBottomPadding,
} from './composer-sheet-layout';

// The system sheet, sized to its content.
export function ComposerSheet(props: ComposerSheetProps): React.JSX.Element {
  const paddingBottom = useComposerSheetBottomPadding();
  return (
    <View style={props.style}>
      {cloneElement(props.trigger, { onPress: () => props.onOpenChange(true) })}
      <Host matchContents style={{ position: 'absolute' }}>
        <BottomSheet
          isPresented={props.open}
          onIsPresentedChange={props.onOpenChange}
          // iOS presents a picker on the top view controller, so report closing once the sheet has gone.
          onDismiss={props.onClosed}
          fitToContents
        >
          <Group modifiers={[presentationDragIndicator('visible')]}>
            <RNHostView matchContents>
              <View
                accessibilityLabel={props.label}
                accessibilityViewIsModal
                className="pt-4"
                style={{ paddingBottom }}
              >
                {props.children}
              </View>
            </RNHostView>
          </Group>
        </BottomSheet>
      </Host>
    </View>
  );
}
