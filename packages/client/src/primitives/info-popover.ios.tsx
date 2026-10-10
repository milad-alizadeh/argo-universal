import { Host, Popover, RNHostView, Text } from '@expo/ui/swift-ui';
import { fixedSize, frame, padding } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Icon } from '../lib/icon';
import { type InfoPopoverProps, infoPopoverTriggerClass } from './info-popover-props';

// The system popover, so it shows above a native sheet with the platform's glass; the "i" is the app's icon so it matches the chevrons.
export function InfoPopover({
  accessibilityLabel,
  text,
}: InfoPopoverProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <Host matchContents>
      <Popover
        isPresented={open}
        onIsPresentedChange={setOpen}
        arrowEdge="bottom"
      >
        <Popover.Trigger>
          <RNHostView matchContents>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              onPress={() => setOpen(true)}
              className={infoPopoverTriggerClass}
            >
              <Icon name="info" className="text-muted-foreground" />
            </Pressable>
          </RNHostView>
        </Popover.Trigger>
        <Popover.Content>
          <Text
            modifiers={[
              fixedSize({ horizontal: false, vertical: true }),
              frame({ width: 240, alignment: 'leading' }),
              padding({ all: 12 }),
            ]}
          >
            {text}
          </Text>
        </Popover.Content>
      </Popover>
    </Host>
  );
}
