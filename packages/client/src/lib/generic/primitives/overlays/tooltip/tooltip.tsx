import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import type { TriggerElement } from '#primitives/overlays/open-state';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#primitives/overlays/popover';

type TooltipProps = { label: string; children: TriggerElement };

export function Tooltip(props: TooltipProps): ReactElement {
  return (
    <Popover openOnHover>
      <PopoverTrigger>{props.children}</PopoverTrigger>
      <TooltipContent label={props.label} />
    </Popover>
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
      className="w-auto rounded-full border-0 bg-primary px-3 py-2 shadow-card"
    >
      <TooltipLabel label={label} />
    </PopoverContent>
  );
}

function TooltipLabel({ label }: Pick<TooltipProps, 'label'>): ReactElement {
  return (
    <View role="tooltip">
      <Text role="body" className="text-primary-foreground whitespace-nowrap">
        {label}
      </Text>
    </View>
  );
}
