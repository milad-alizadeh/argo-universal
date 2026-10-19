import type * as React from 'react';
import { View } from 'react-native';
import { TextClassContext } from '#primitives/content/text';
import { triggerChild, useOpenState } from '#primitives/overlays/open-state';
import { Sheet } from '#primitives/overlays/sheet';
import { PopoverContext, usePopoverState } from './popover-context';
import type {
  PopoverContentProps as ContentProps,
  PopoverProps,
  PopoverTriggerProps as TriggerProps,
} from './popover-props';

export { usePopoverClose } from './popover-context';

// Phones show a popover's content in a Sheet, as every overlay is a popover on desktop and a sheet on a phone.
function Popover(props: PopoverProps): React.JSX.Element {
  const state = useOpenState(props);

  return (
    <PopoverContext.Provider value={state}>
      <View className={props.className} style={props.style}>
        {props.children}
      </View>
    </PopoverContext.Provider>
  );
}

function PopoverTrigger(props: TriggerProps): React.ReactElement | null {
  const { open, onOpenChange } = usePopoverState();

  return triggerChild(
    props.children,
    { onPress: () => onOpenChange(!open) },
    { role: 'button', disabled: props.disabled },
  );
}

export function PopoverHoverGroup({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}

// The sheet gives the popover's content the standard sheet inset.
function PopoverContent(props: ContentProps): React.JSX.Element {
  return (
    <Sheet
      {...usePopoverState()}
      onClosed={props.onClosed}
      label={props.accessibilityLabel}
      inset
    >
      <TextClassContext.Provider value="text-foreground">
        {props.children}
      </TextClassContext.Provider>
    </Sheet>
  );
}

export { Popover, PopoverContent, PopoverTrigger };

Popover satisfies React.ComponentType<PopoverProps>;

PopoverContent satisfies React.ComponentType<ContentProps>;

PopoverTrigger satisfies React.ComponentType<TriggerProps>;
