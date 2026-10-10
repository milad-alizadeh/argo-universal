import type * as React from 'react';
import { IconButton } from './icon-button';
import type { InfoPopoverProps } from './info-popover-props';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Text } from './text';

export function InfoPopover(props: InfoPopoverProps): React.JSX.Element {
  return (
    <Popover>
      <InfoButton accessibilityLabel={props.accessibilityLabel} />
      <PopoverContent side="top" align="start" className="w-64 p-3">
        <Text selectable={false} className="select-none type-secondary">
          {props.text}
        </Text>
      </PopoverContent>
    </Popover>
  );
}

function InfoButton({
  accessibilityLabel,
}: Pick<InfoPopoverProps, 'accessibilityLabel'>): React.JSX.Element {
  return (
    <PopoverTrigger asChild>
      <IconButton
        {...infoButtonProps}
        accessibilityLabel={accessibilityLabel}
        icon={'info'}
        iconClassName={'text-muted-foreground'}
        size="sm"
      />
    </PopoverTrigger>
  );
}

const infoButtonProps = {
  variant: 'ghost',
  size: 'sm',
  className: 'size-7 sm:size-7',
} satisfies Pick<
  React.ComponentProps<typeof IconButton>,
  'variant' | 'size' | 'className'
>;
