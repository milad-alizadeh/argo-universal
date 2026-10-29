import { cloneElement, type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import type {
  TriggerElement,
  TriggerHandlers,
} from '#primitives/overlays/open-state';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover';
import type { KitProps } from '../../kit-props';

// Kit-only: the interactive trigger.
type TooltipProps = KitProps<'Tooltip'> & {
  children: TriggerElement;
  // A parent can keep the same trigger mounted while its label becomes truncated.
  active?: boolean;
};

type TooltipState = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
  onPointerLeave: () => void;
};

export function Tooltip(props: TooltipProps): ReactElement {
  const state = useTooltipState(props.active);

  return (
    <Popover open={state.open} onOpenChange={state.onOpenChange} openOnHover>
      <TooltipTrigger
        onDismiss={state.onDismiss}
        onPointerLeave={state.onPointerLeave}
      >
        {props.children}
      </TooltipTrigger>
      <TooltipContent label={props.label} />
    </Popover>
  );
}

function useTooltipState(active: boolean | undefined): TooltipState {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return {
    open: active !== false && open && !dismissed,
    onOpenChange: setOpen,
    onDismiss: (): void => setDismissed(true),
    onPointerLeave: (): void => setDismissed(false),
  };
}

type TooltipTriggerProps = {
  children: TriggerElement;
  onDismiss: () => void;
  onPointerLeave: () => void;
};

function TooltipTrigger(props: TooltipTriggerProps): ReactElement {
  const actions = useTooltipTriggerActions(
    props.onDismiss,
    props.onPointerLeave,
  );

  return (
    <PopoverTrigger>
      {props.children && tooltipTriggerElement(props.children, actions)}
    </PopoverTrigger>
  );
}

type TooltipTriggerActions = {
  onDismiss: () => void;
  onPointerLeave: () => void;
  close: () => void;
};

function useTooltipTriggerActions(
  onDismiss: () => void,
  onPointerLeave: () => void,
): TooltipTriggerActions {
  return { onDismiss, onPointerLeave, close: usePopoverClose() };
}

function tooltipTriggerElement(
  children: Exclude<TriggerElement, undefined>,
  actions: TooltipTriggerActions,
): Exclude<TriggerElement, undefined> {
  return cloneElement(children, {
    onPress: handlePress(children, actions.onDismiss, actions.close),
    onHoverOut: handleHoverOut(children, actions.onPointerLeave),
  });
}

function handlePress(
  children: TriggerElement,
  onDismiss: () => void,
  close: () => void,
): NonNullable<TriggerHandlers['onPress']> {
  return (event) => {
    children?.props.onPress?.(event);
    onDismiss();
    setTimeout(close, 0);
  };
}

function handleHoverOut(
  children: TriggerElement,
  onPointerLeave: () => void,
): NonNullable<TriggerHandlers['onHoverOut']> {
  return (event) => {
    children?.props.onHoverOut?.(event);
    onPointerLeave();
  };
}

const preventFocus = (event: Event): void => event.preventDefault();

function TooltipContent({ label }: Pick<TooltipProps, 'label'>): ReactElement {
  return (
    <PopoverContent
      side="bottom"
      align="start"
      onOpenAutoFocus={preventFocus}
      onCloseAutoFocus={preventFocus}
      className="w-auto max-w-64 rounded-sm border-0 bg-primary px-2 py-1 shadow-control"
    >
      <TooltipLabel label={label} />
    </PopoverContent>
  );
}

function TooltipLabel({ label }: Pick<TooltipProps, 'label'>): ReactElement {
  return (
    <View role="tooltip">
      <Text
        role="secondary"
        className="text-primary-foreground whitespace-normal"
      >
        {label}
      </Text>
    </View>
  );
}
