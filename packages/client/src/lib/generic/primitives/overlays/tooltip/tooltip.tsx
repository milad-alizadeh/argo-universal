import { cloneElement, type ReactElement, useContext, useState } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import type { TriggerElement } from '#primitives/overlays/open-state';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover';
import { PopoverHover } from '../popover/popover-hover';

type TooltipProps = { label: string; children: TriggerElement };

export function Tooltip(props: TooltipProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <Popover open={open && !dismissed} onOpenChange={setOpen} openOnHover>
      <TooltipTrigger
        onDismiss={() => setDismissed(true)}
        onPointerLeave={() => setDismissed(false)}
      >
        {props.children}
      </TooltipTrigger>
      <TooltipContent label={props.label} />
    </Popover>
  );
}

function TooltipTrigger({
  children,
  onDismiss,
  onPointerLeave,
}: {
  children: TriggerElement;
  onDismiss: () => void;
  onPointerLeave: () => void;
}): ReactElement {
  const close = usePopoverClose();
  const hover = useContext(PopoverHover);
  if (!children) return <PopoverTrigger>{children}</PopoverTrigger>;

  return (
    <PopoverTrigger>
      {cloneElement(children, {
        onPress: (event) => {
          children.props.onPress?.(event);
          hover?.dismiss();
          onDismiss();
          setTimeout(close, 0);
        },
        onHoverOut: (event) => {
          children.props.onHoverOut?.(event);
          onPointerLeave();
        },
      })}
    </PopoverTrigger>
  );
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
