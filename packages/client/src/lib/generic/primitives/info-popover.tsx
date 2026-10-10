import type * as React from 'react';
import { Icon } from '../symbols/icon';
import { Button } from './button';
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
      <Button {...infoButtonProps} accessibilityLabel={accessibilityLabel}>
        <Icon name="info" className="text-muted-foreground" />
      </Button>
    </PopoverTrigger>
  );
}

const infoButtonProps = {
  variant: 'ghost',
  size: 'icon',
  className: 'size-7 sm:size-7',
} satisfies React.ComponentProps<typeof Button>;
