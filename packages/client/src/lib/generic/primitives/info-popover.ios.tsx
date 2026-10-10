import { Popover, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  fixedSize,
  foregroundStyle,
  frame,
  padding,
  presentationBackground,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useState } from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import type { InfoPopoverProps } from './info-popover-props';
import { InfoPopoverTrigger } from './info-popover-trigger';

export function InfoPopover(props: InfoPopoverProps): React.JSX.Element {
  const { anchor, presentation } = useInfoPresentation(
    props.accessibilityLabel,
  );
  return (
    <Host matchContents>
      <Popover {...presentation}>
        <PopoverAnchor {...anchor} />
        <PopoverText text={props.text} />
      </Popover>
    </Host>
  );
}

function PopoverAnchor(
  props: React.ComponentProps<typeof InfoPopoverTrigger>,
): React.JSX.Element {
  return (
    <Popover.Trigger>
      <RNHostView matchContents>
        <InfoPopoverTrigger {...props} />
      </RNHostView>
    </Popover.Trigger>
  );
}

function PopoverText({
  text,
}: Pick<InfoPopoverProps, 'text'>): React.JSX.Element {
  const modifiers = [
    fixedSize({ horizontal: false, vertical: true }),
    frame({ width: 240, alignment: 'leading' }),
    padding({ all: 12 }),
    ...popoverColors(useNativeTheme().colors),
  ];
  return (
    <Popover.Content>
      <Text modifiers={modifiers}>{text}</Text>
    </Popover.Content>
  );
}

function popoverColors(
  colors: NativeColors,
): ReturnType<typeof foregroundStyle>[] {
  const { popover, popoverForeground } = colors;
  return [
    ...(popoverForeground === undefined
      ? []
      : [foregroundStyle(popoverForeground)]),
    ...(popover === undefined ? [] : [presentationBackground(popover)]),
  ];
}

type InfoPresentation = {
  anchor: React.ComponentProps<typeof InfoPopoverTrigger>;
  presentation: Omit<React.ComponentProps<typeof Popover>, 'children'>;
};

function useInfoPresentation(accessibilityLabel: string): InfoPresentation {
  const [open, setOpen] = useState(false);
  return {
    anchor: { accessibilityLabel, onPress: (): void => setOpen(true) },
    presentation: {
      isPresented: open,
      onIsPresentedChange: setOpen,
      arrowEdge: 'bottom',
    },
  };
}
